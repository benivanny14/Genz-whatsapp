jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../models/Message', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/Status', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Status = require('../models/Status');
const quickActions = require('../controllers/quickActionsController');

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
  quickActionsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('quickActionsController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await quickActions.getQuickActionsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ quickActionsSettings: { callBlocker: false } }));
    const res = makeRes();
    await quickActions.getQuickActionsSettings(makeReq(), res);
    expect(res.body.settings.callBlocker).toBe(false);
    expect(res.body.settings.exportChat).toBe(true); // default
    expect(res.body.settings.massMessage).toBe(true); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await quickActions.updateQuickActionsSettings(makeReq({ body: { settings: { aiStickers: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.aiStickers).toBe(false);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ quickActionsSettings: { callBlocker: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await quickActions.resetQuickActionsSettings(makeReq(), res);
    expect(res.body.settings.callBlocker).toBe(true); // default
  });
});

describe('quickActionsController — actions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects mass message without recipients (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await quickActions.sendMassMessage(makeReq({ body: { content: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Recipients are required');
  });

  it('sends a mass message (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findOne.mockResolvedValue({ _id: 'conv-1' });
    Message.create.mockResolvedValue({ _id: 'msg-1' });
    Message.countDocuments.mockResolvedValue(0);
    const res = makeRes();
    await quickActions.sendMassMessage(makeReq({ body: { recipients: ['user-2', 'user-3'], content: 'hi' } }), res);
    expect(res.body.sent).toBe(2);
    expect(res.body.failed).toBe(0);
    expect(Message.create).toHaveBeenCalledTimes(2);
  });

  it('rejects more than 20 recipients (rate limit)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const manyRecipients = Array.from({ length: 21 }, (_, i) => `user-${i}`);
    const res = makeRes();
    await quickActions.sendMassMessage(makeReq({ body: { recipients: manyRecipients, content: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/20 recipients/);
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('rejects a 6th mass message within the hour (rate limit)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.countDocuments.mockResolvedValue(5);
    const res = makeRes();
    await quickActions.sendMassMessage(makeReq({ body: { recipients: ['user-2'], content: 'hi' } }), res);
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toBe('Rate limit exceeded');
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('rejects export chat without a conversationId (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await quickActions.exportChat(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('exports a chat as JSON (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ _id: 'conv-1', name: 'Family', participants: ['user-1'] });
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) })
    });
    const res = makeRes();
    await quickActions.exportChat(makeReq({ body: { conversationId: 'conv-1', format: 'json' } }), res);
    expect(res.body.success).toBe(true);
    expect(JSON.parse(res.body.data).conversationName).toBe('Family');
  });

  it('returns 501 for clear-all-chats (safety disabled)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await quickActions.clearAllChats(makeReq(), res);
    expect(res.statusCode).toBe(501);
    expect(res.body.message).toContain('disabled');
  });

  it('rejects jump-to-date without conversation/date (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await quickActions.jumpToDate(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Conversation ID and date are required');
  });

  it('jumps to a date and returns messages (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'm1' }]) })
    });
    const res = makeRes();
    await quickActions.jumpToDate(makeReq({ body: { conversationId: 'conv-1', date: '2026-08-01' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.messageCount).toBe(1);
  });

  it('rejects create-poll without enough options (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await quickActions.createPoll(makeReq({ body: { conversationId: 'conv-1', question: 'Q', options: ['A'] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates a poll message (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ _id: 'conv-1', participants: ['user-1'] });
    Message.create.mockResolvedValue({ _id: 'msg-1' });
    const res = makeRes();
    await quickActions.createPoll(makeReq({ body: { conversationId: 'conv-1', question: 'Best?', options: ['A', 'B'] } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.poll.options).toHaveLength(2);
    expect(res.body.messageId).toBe('msg-1');
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ messageType: 'poll' }));
  });

  it('rejects download-status without an id (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await quickActions.downloadStatus(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns the media URL for a downloadable status (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Status.findById.mockResolvedValue({ mediaUrl: 'https://x/s.jpg', mediaType: 'image', caption: 'hi' });
    const res = makeRes();
    await quickActions.downloadStatus(makeReq({ body: { statusId: 's1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.mediaUrl).toBe('https://x/s.jpg');
  });
});
