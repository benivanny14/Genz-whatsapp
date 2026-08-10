jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const storageManager = require('../controllers/storageManagerController');

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
  storageManagerSettings: {},
  cacheData: { temp: true },
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeMessage = (overrides = {}) => ({
  _id: 'm1',
  conversationId: 'conv-1',
  content: 'hi',
  messageType: 'text',
  mediaUrl: null,
  createdAt: new Date(),
  ...overrides
});

describe('storageManagerController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await storageManager.getStorageManagerSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ storageManagerSettings: { maxStorageSize: 512 } }));
    const res = makeRes();
    await storageManager.getStorageManagerSettings(makeReq(), res);
    expect(res.body.settings.maxStorageSize).toBe(512);
    expect(res.body.settings.cleanupInterval).toBe(7); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storageManager.updateStorageManagerSettings(makeReq({ body: { settings: { autoCleanup: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.autoCleanup).toBe(true);
  });

  it('toggles auto cleanup (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storageManager.toggleAutoCleanup(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.autoCleanup).toBe(true);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ storageManagerSettings: { maxStorageSize: 1 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storageManager.resetStorageManagerSettings(makeReq(), res);
    expect(res.body.settings.maxStorageSize).toBe(1024); // default
  });
});

describe('storageManagerController — usage & cleanup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes storage usage breakdown (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([
      { _id: 'conv-1', isGroup: true },
      { _id: 'conv-2', isGroup: false }
    ]);
    Message.find.mockResolvedValue([
      makeMessage({ mediaUrl: 'https://x/i.jpg' }),
      makeMessage({})
    ]);
    const res = makeRes();
    await storageManager.getStorageUsage(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.breakdown.messages.total).toBe(2);
    expect(res.body.breakdown.messages.media).toBe(1);
    expect(res.body.breakdown.conversations.groups).toBe(1);
    expect(res.body.breakdown.storage.warningLevel).toBe('normal');
  });

  it('returns 501 for server-side message cleanup (safety disabled)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await storageManager.cleanupOldMessages(makeReq(), res);
    expect(res.statusCode).toBe(501);
    expect(res.body.message).toContain('disabled');
  });

  it('returns 501 for server-side media cleanup (safety disabled)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await storageManager.cleanupOldMedia(makeReq(), res);
    expect(res.statusCode).toBe(501);
    expect(res.body.message).toContain('disabled');
  });

  it('clears the user cache (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storageManager.clearCache(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(user.cacheData).toEqual({});
    expect(user.save).toHaveBeenCalled();
  });

  it('records the compression timestamp (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storageManager.compressStorage(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(user.lastCompressedAt).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
  });

  it('returns a per-conversation breakdown sorted by size (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([
      { _id: 'conv-1', name: 'Busy', isGroup: true },
      { _id: 'conv-2', name: 'Quiet', isGroup: false }
    ]);
    Message.find.mockImplementation((query) => {
      if (String(query.conversationId) === 'conv-1') {
        return Promise.resolve([makeMessage({ mediaUrl: 'https://x/i.jpg' })]);
      }
      return Promise.resolve([makeMessage({})]);
    });
    const res = makeRes();
    await storageManager.getConversationBreakdown(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.breakdown).toHaveLength(2);
    expect(res.body.breakdown[0].conversationId).toBe('conv-1');
  });
});
