jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const genzMods = require('../controllers/genzModsController');

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
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  genzMods: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeMessage = (overrides = {}) => ({
  _id: 'msg-1',
  sender: 'user-1',
  conversationId: 'conv-1',
  content: 'original text',
  originalContent: 'original text',
  deletedForEveryone: true,
  wasDeletedBySender: true,
  deletedAt: new Date(),
  status: 'delivered',
  readBy: [],
  reactions: [],
  editedAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('genzModsController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await genzMods.getGenzModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ genzMods: { ghostMode: true } }));
    const res = makeRes();
    await genzMods.getGenzModsSettings(makeReq(), res);
    expect(res.body.settings.ghostMode).toBe(true);
    expect(res.body.settings.antiDeleteMessages).toBe(false); // paid features are opt-in
    expect(res.body.settings.antiDelete).toBe(false); // mirrored for the frontend contract
    expect(res.body.settings.hideOnline).toBe(false); // default
  });

  it('disables legacy premium mods for a non-premium user', async () => {
    User.findById.mockResolvedValue(makeUser({
      genzMods: { antiDeleteMessages: true, highResMedia: true, voiceEffect: 'robot' }
    }));
    const res = makeRes();
    await genzMods.getGenzModsSettings(makeReq(), res);
    expect(res.body.settings.antiDeleteMessages).toBe(false);
    expect(res.body.settings.highResMedia).toBe(false);
    expect(res.body.settings.voiceEffect).toBe('none');
  });

  it('returns disabled premium defaults even when the fields are absent for a non-premium user', async () => {
    User.findById.mockResolvedValue(makeUser({ genzMods: { ghostMode: true } }));
    const res = makeRes();
    await genzMods.getGenzModsSettings(makeReq(), res);
    expect(res.body.settings.ghostMode).toBe(true);
    expect(res.body.settings.antiScreenshot).toBe(false);
    expect(res.body.settings.glassMode).toBe(false);
    expect(res.body.settings.storyHighlights).toBe(false);
    expect(res.body.settings.fakeChatCover).toBe(false);
    expect(res.body.settings.chatMusic).toBe(false);
    expect(res.body.settings.chatMusicUrl).toBe('');
  });

  it('updates settings and normalizes ghost mode (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await genzMods.updateGenzModsSettings(makeReq({ body: { ghostMode: true } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(user.markModified).toHaveBeenCalledWith('genzMods');
    expect(res.body.settings.ghostMode).toBe(true);
    expect(res.body.settings.hideOnline).toBe(true);
    expect(res.body.settings.hideTyping).toBe(true);
    expect(res.body.settings.hideRecording).toBe(true);
  });

  it('mirrors a ghostMode OBJECT (GENZ Mods page) to the top-level flags', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await genzMods.updateGenzModsSettings(makeReq({
      body: { ghostMode: { hideOnline: true, hideTyping: false, hideRecording: true, freezeLastSeen: true } }
    }), res);
    expect(res.body.settings.hideOnline).toBe(true);
    expect(res.body.settings.hideTyping).toBe(false);
    expect(res.body.settings.hideRecording).toBe(true);
    expect(res.body.settings.freezeLastSeen).toBe(true);
    // the object itself is preserved so the GENZ Mods page still reads it
    expect(res.body.settings.ghostMode).toEqual({ hideOnline: true, hideTyping: false, hideRecording: true, freezeLastSeen: true });
  });

  it('normalizes autoReply boolean into an object (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await genzMods.updateGenzModsSettings(makeReq({ body: { autoReply: true, autoReplyMsg: 'Brb' } }), res);
    expect(res.body.settings.autoReply.enabled).toBe(true);
    expect(res.body.settings.autoReply.message).toBe('Brb');
    expect(user.autoReplyEnabled).toBe(true);
    expect(user.autoReplyMessage).toBe('Brb');
  });

  it('maps hideReadReceipts to readReceipts (normalization)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await genzMods.updateGenzModsSettings(makeReq({ body: { hideReadReceipts: true } }), res);
    expect(res.body.settings.readReceipts).toBe(false);
  });
});

describe('genzModsController — deleted messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists deleted messages (happy path)', async () => {
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([makeMessage({ content: '[deleted]' })])
    });
    const res = makeRes();
    await genzMods.getDeletedMessages(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(Message.find).toHaveBeenCalledWith(expect.objectContaining({ deletedForEveryone: true }));
    // The mod viewer must surface the preserved originalContent, not the
    // scrubbed '[deleted]' placeholder (SECURITY 1.6 scrub).
    expect(res.body.messages[0].content).toBe('original text');
    expect(res.body.messages[0].id).toBe('msg-1');
    expect(res.body.messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('returns 404 when restoring an unknown message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await genzMods.restoreDeletedMessage(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects restore when not sender or participant (403)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ sender: 'user-9' }));
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ participants: ['user-5'] }) });
    const res = makeRes();
    await genzMods.restoreDeletedMessage(makeReq({ params: { id: 'msg-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('restores a deleted message (happy path)', async () => {
    const message = makeMessage();
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ participants: ['user-1'] }) });
    const res = makeRes();
    await genzMods.restoreDeletedMessage(makeReq({ params: { id: 'msg-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(message.content).toBe('original text');
    expect(message.deletedForEveryone).toBe(false);
    expect(message.save).toHaveBeenCalled();
  });
});

describe('genzModsController — auto reply', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await genzMods.processAutoReply(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('processes auto reply settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await genzMods.processAutoReply(makeReq({ body: { autoReply: { enabled: true, message: 'Busy', keywords: ['hi'] } } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.autoReply.enabled).toBe(true);
    expect(res.body.autoReply.message).toBe('Busy');
    expect(user.autoReplyEnabled).toBe(true);
  });

  it('gets the current auto reply (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ genzMods: { autoReply: { enabled: true, message: 'BRB', keywords: ['later'] } } }));
    const res = makeRes();
    await genzMods.getAutoReply(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.autoReply.message).toBe('BRB');
    expect(res.body.autoReply.keywords).toEqual(['later']);
  });
});

describe('genzModsController — user status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when the target user is missing', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await genzMods.getUserStatus(makeReq({ params: { userId: 'user-2' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('masks online status when hideOnline is set', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isOnline: true, lastSeen: new Date(), genzMods: { hideOnline: true } })
    });
    const res = makeRes();
    await genzMods.getUserStatus(makeReq({ params: { userId: 'user-2' } }), res);
    expect(res.body.userStatus.isOnline).toBe(false);
  });

  it('reports online when alwaysOnline is enabled', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isOnline: false, lastSeen: new Date(), genzMods: { alwaysOnline: true } })
    });
    const res = makeRes();
    await genzMods.getUserStatus(makeReq({ params: { userId: 'user-2' } }), res);
    expect(res.body.userStatus.isOnline).toBe(true);
  });

  it('hides last seen when freezeLastSeen is enabled', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isOnline: true, lastSeen: new Date(), genzMods: { freezeLastSeen: true } })
    });
    const res = makeRes();
    await genzMods.getUserStatus(makeReq({ params: { userId: 'user-2' } }), res);
    expect(res.body.userStatus.lastSeen).toBeNull();
  });
});

describe('genzModsController — delegated toggles', () => {
  beforeEach(() => jest.clearAllMocks());

  const toggleTest = async (handler, body, expected) => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await handler(makeReq({ body }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.settings).toEqual(expect.objectContaining(expected));
  };

  it('updateGhostMode enables ghost mode', async () => {
    await toggleTest(genzMods.updateGhostMode, { enabled: true }, { ghostMode: true, hideOnline: true, hideTyping: true, hideRecording: true });
  });

  it('updateReadReceipts toggles read receipts', async () => {
    await toggleTest(genzMods.updateReadReceipts, { enabled: true }, { readReceipts: true });
    await toggleTest(genzMods.updateReadReceipts, { enabled: false }, { readReceipts: false });
  });

  it('updateTypingIndicators toggles typing indicators', async () => {
    await toggleTest(genzMods.updateTypingIndicators, { enabled: false }, { typingIndicators: false, hideTyping: true });
  });

  it('updateOnlineStatus toggles online visibility', async () => {
    await toggleTest(genzMods.updateOnlineStatus, { visible: false }, { onlineStatusVisible: false, hideOnline: true });
  });

  it('freezeLastSeen freezes the last seen timestamp', async () => {
    await toggleTest(genzMods.freezeLastSeen, { freeze: true }, { freezeLastSeen: true, hideLastSeen: true });
  });

  it('importModSettings delegates to update', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await genzMods.importModSettings(makeReq({ body: { settings: { ghostMode: true } } }), res);
    expect(res.body.settings.ghostMode).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });
});

describe('genzModsController — tracking & stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when tracking an unknown message', async () => {
    Message.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis()
    });
    Message.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis()
    });
    // findById(...).populate().populate() — resolve null
    Message.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      })
    });
    const res = makeRes();
    await genzMods.getMessageTracking(makeReq({ params: { messageId: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects tracking when not sender or participant (403)', async () => {
    Message.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(makeMessage({ sender: 'user-9' }))
      })
    });
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ participants: ['user-5'] }) });
    const res = makeRes();
    await genzMods.getMessageTracking(makeReq({ params: { messageId: 'msg-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('returns message tracking (happy path)', async () => {
    const message = makeMessage({ readBy: [{ user: 'user-2' }], reactions: [{ user: 'user-2', emoji: '🔥' }] });
    Message.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(message)
      })
    });
    const res = makeRes();
    await genzMods.getMessageTracking(makeReq({ params: { messageId: 'msg-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.tracking.readBy).toHaveLength(1);
    expect(res.body.tracking.reactions[0].emoji).toBe('🔥');
  });

  it('counts enabled mods in stats (happy path)', async () => {
    const user = makeUser({ genzMods: { ghostMode: true, hideOnline: true, autoReply: { enabled: true, message: 'x' } } });
    const res = makeRes();
    await genzMods.getModStats(makeReq({ user }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.enabledCount).toBeGreaterThanOrEqual(3);
  });

  it('exports mod settings (happy path)', async () => {
    const user = makeUser({ genzMods: { ghostMode: true } });
    const res = makeRes();
    await genzMods.exportModSettings(makeReq({ user }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.ghostMode).toBe(true);
  });
});
