jest.mock('../services/userScopedService', () => ({
  ...jest.requireActual('../services/userScopedService'),
  getUser: jest.fn()
}));

jest.mock('../models/User', () => ({
  find: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { getUser } = require('../services/userScopedService');
const antiRevoke = require('../controllers/antiRevokeController');

const makeRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  antiRevokeSettings: {},
  deletedMessagesCache: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const future = () => new Date(Date.now() + 86400000); // +1 day

beforeEach(() => jest.clearAllMocks());

describe('antiRevokeController — settings', () => {
  it('returns 401 when the user cannot be resolved (auth)', async () => {
    // userScopedService.getUser sends the 401 itself and returns null
    getUser.mockImplementation((req, res) => {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return Promise.resolve(null);
    });
    const res = makeRes();
    await antiRevoke.getAntiRevokeSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    getUser.mockResolvedValue(makeUser({ antiRevokeSettings: { antiRevokeEnabled: true } }));
    const res = makeRes();
    await antiRevoke.getAntiRevokeSettings(makeReq(), res);
    expect(res.body.settings.antiRevokeEnabled).toBe(true);
    expect(res.body.settings.cacheRetentionDays).toBe(7); // default
    expect(res.body.settings.notifyOnDelete).toBe(false); // default
  });

  it('handles settings stored as a Mongoose document via toObject()', async () => {
    const doc = { toObject: () => ({ cacheRetentionDays: 3 }) };
    getUser.mockResolvedValue(makeUser({ antiRevokeSettings: doc }));
    const res = makeRes();
    await antiRevoke.getAntiRevokeSettings(makeReq(), res);
    expect(res.body.settings.cacheRetentionDays).toBe(3);
    expect(res.body.settings.antiRevokeEnabled).toBe(false); // default
  });

  it('updates settings and marks the path modified (happy path)', async () => {
    const user = makeUser({ antiRevokeSettings: { cacheRetentionDays: 7 } });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.updateAntiRevokeSettings(makeReq({ body: { settings: { cacheRetentionDays: 30 } } }), res);
    expect(user.markModified).toHaveBeenCalledWith('antiRevokeSettings');
    expect(user.save).toHaveBeenCalled();
    expect(user.antiRevokeSettings.cacheRetentionDays).toBe(30);
    expect(res.body.settings.cacheRetentionDays).toBe(30);
  });

  it('accepts a raw body when no settings key is present', async () => {
    const user = makeUser();
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.updateAntiRevokeSettings(makeReq({ body: { notifyOnDelete: true } }), res);
    expect(user.antiRevokeSettings.notifyOnDelete).toBe(true);
  });

  it('returns 500 when the service throws', async () => {
    getUser.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await antiRevoke.getAntiRevokeSettings(makeReq(), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('boom');
  });
});

describe('antiRevokeController — cacheDeletedMessage', () => {
  it('returns 400 when messageId or conversationId is missing (validation)', async () => {
    getUser.mockResolvedValue(makeUser());
    const res = makeRes();
    await antiRevoke.cacheDeletedMessage(makeReq({ body: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Message ID and conversation ID are required');
  });

  it('skips caching when anti-revoke is disabled', async () => {
    const user = makeUser({ antiRevokeSettings: { antiRevokeEnabled: false, cacheDeletedMessages: true } });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.cacheDeletedMessage(makeReq({ body: { messageId: 'm1', conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.cached).toBe(false);
    expect(user.save).not.toHaveBeenCalled();
  });

  it('caches the deleted message with retention expiry (happy path)', async () => {
    const user = makeUser({ antiRevokeSettings: { antiRevokeEnabled: true, cacheDeletedMessages: true, cacheRetentionDays: 7 } });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.cacheDeletedMessage(makeReq({
      body: { messageId: 'm1', conversationId: 'c1', content: 'bye', messageType: 'text', sender: 'user-2', deletedBy: 'user-2' }
    }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(user.deletedMessagesCache).toHaveLength(1);
    expect(user.deletedMessagesCache[0].messageId).toBe('m1');
    expect(user.deletedMessagesCache[0].expiresAt).toBeInstanceOf(Date);
    expect(user.markModified).toHaveBeenCalledWith('deletedMessagesCache');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('antiRevokeController — getCachedDeletedMessages', () => {
  it('returns all cached messages (happy path)', async () => {
    const user = makeUser({
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1', expiresAt: future() },
        { messageId: 'm2', conversationId: 'c2', expiresAt: future() }
      ]
    });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.getCachedDeletedMessages(makeReq(), res);
    expect(res.body.cachedMessages).toHaveLength(2);
    expect(user.save).toHaveBeenCalled();
  });

  it('filters by conversationId when provided', async () => {
    const user = makeUser({
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1', expiresAt: future() },
        { messageId: 'm2', conversationId: 'c2', expiresAt: future() }
      ]
    });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.getCachedDeletedMessages(makeReq({ query: { conversationId: 'c2' } }), res);
    expect(res.body.cachedMessages).toHaveLength(1);
    expect(res.body.cachedMessages[0].messageId).toBe('m2');
  });

  it('drops expired messages', async () => {
    const past = new Date(Date.now() - 1000);
    const user = makeUser({
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1', expiresAt: past },
        { messageId: 'm2', conversationId: 'c1', expiresAt: future() }
      ]
    });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.getCachedDeletedMessages(makeReq({ query: { conversationId: 'c1' } }), res);
    expect(res.body.cachedMessages).toHaveLength(1);
    expect(res.body.cachedMessages[0].messageId).toBe('m2');
    expect(user.deletedMessagesCache).toHaveLength(1);
  });
});

describe('antiRevokeController — spyViewDeletedMessages', () => {
  it('returns 403 when the viewer is not enabled', async () => {
    getUser.mockResolvedValue(makeUser({ antiRevokeSettings: { antiRevokeEnabled: true, showDeletedMessages: false } }));
    const res = makeRes();
    await antiRevoke.spyViewDeletedMessages(makeReq(), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Anti-revoke viewer is not enabled');
  });

  it('enriches messages with sender and conversation details (happy path)', async () => {
    const user = makeUser({
      antiRevokeSettings: { antiRevokeEnabled: true, showDeletedMessages: true },
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1', sender: 'user-2', content: 'bye', cachedAt: new Date() }
      ]
    });
    getUser.mockResolvedValue(user);
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'user-2', username: 'bob', phoneNumber: '255', profilePicture: 'pic' }]) });
    Conversation.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'c1', name: 'Chat', isGroup: false }]) });
    const res = makeRes();
    await antiRevoke.spyViewDeletedMessages(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.messages[0].sender.username).toBe('bob');
    expect(res.body.messages[0].conversation.name).toBe('Chat');
  });

  it('leaves sender/conversation null when lookups miss', async () => {
    const user = makeUser({
      antiRevokeSettings: { antiRevokeEnabled: true, showDeletedMessages: true },
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1', sender: 'user-9', content: 'x', cachedAt: new Date() }
      ]
    });
    getUser.mockResolvedValue(user);
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    Conversation.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = makeRes();
    await antiRevoke.spyViewDeletedMessages(makeReq(), res);
    expect(res.body.messages[0].sender).toBe(null);
    expect(res.body.messages[0].conversation).toBe(null);
  });
});

describe('antiRevokeController — clearCachedMessages', () => {
  it('returns early when there is no cache', async () => {
    const user = makeUser({ deletedMessagesCache: undefined });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.clearCachedMessages(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('No cached messages');
    expect(user.save).not.toHaveBeenCalled();
  });

  it('clears a single message by messageId', async () => {
    const user = makeUser({
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1' },
        { messageId: 'm2', conversationId: 'c1' }
      ]
    });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.clearCachedMessages(makeReq({ query: { messageId: 'm1' } }), res);
    expect(user.deletedMessagesCache).toHaveLength(1);
    expect(user.deletedMessagesCache[0].messageId).toBe('m2');
    expect(user.save).toHaveBeenCalled();
  });

  it('clears by conversationId when provided', async () => {
    const user = makeUser({
      deletedMessagesCache: [
        { messageId: 'm1', conversationId: 'c1' },
        { messageId: 'm2', conversationId: 'c2' }
      ]
    });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.clearCachedMessages(makeReq({ query: { conversationId: 'c1' } }), res);
    expect(user.deletedMessagesCache).toHaveLength(1);
    expect(user.deletedMessagesCache[0].messageId).toBe('m2');
  });

  it('clears everything when no filter is given', async () => {
    const user = makeUser({ deletedMessagesCache: [{ messageId: 'm1', conversationId: 'c1' }] });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.clearCachedMessages(makeReq(), res);
    expect(user.deletedMessagesCache).toEqual([]);
  });
});

describe('antiRevokeController — toggleAntiRevoke', () => {
  it('toggles from default (off → on)', async () => {
    const user = makeUser({ antiRevokeSettings: {} });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.toggleAntiRevoke(makeReq(), res);
    expect(user.antiRevokeSettings.antiRevokeEnabled).toBe(true);
    expect(res.body.settings.antiRevokeEnabled).toBe(true);
  });

  it('toggles from on → off', async () => {
    const user = makeUser({ antiRevokeSettings: { antiRevokeEnabled: true } });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.toggleAntiRevoke(makeReq(), res);
    expect(user.antiRevokeSettings.antiRevokeEnabled).toBe(false);
  });

  it('honors an explicit enabled value', async () => {
    const user = makeUser({ antiRevokeSettings: { antiRevokeEnabled: true } });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.toggleAntiRevoke(makeReq({ body: { enabled: true } }), res);
    expect(user.antiRevokeSettings.antiRevokeEnabled).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('antiRevokeSettings');
  });
});

describe('antiRevokeController — resetAntiRevokeSettings', () => {
  it('resets to defaults (happy path)', async () => {
    const user = makeUser({ antiRevokeSettings: { antiRevokeEnabled: true, cacheRetentionDays: 99 } });
    getUser.mockResolvedValue(user);
    const res = makeRes();
    await antiRevoke.resetAntiRevokeSettings(makeReq(), res);
    expect(user.antiRevokeSettings.antiRevokeEnabled).toBe(false);
    expect(user.antiRevokeSettings.cacheRetentionDays).toBe(7);
    expect(res.body.settings.cacheRetentionDays).toBe(7);
  });
});
