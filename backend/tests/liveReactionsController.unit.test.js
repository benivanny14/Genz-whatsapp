jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  findById: jest.fn(),
  updateMany: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const liveReactions = require('../controllers/liveReactionsController');

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
  liveReactionsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('liveReactionsController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await liveReactions.getLiveReactionsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ liveReactionsSettings: { reactionDuration: 10 } }));
    const res = makeRes();
    await liveReactions.getLiveReactionsSettings(makeReq(), res);
    expect(res.body.settings.reactionDuration).toBe(10);
    expect(res.body.settings.maxReactionsPerMessage).toBe(10); // default
    expect(res.body.settings.availableReactions).toContain('❤️');
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await liveReactions.updateLiveReactionsSettings(makeReq({ body: { settings: { soundEnabled: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.soundEnabled).toBe(false);
  });

  it('toggles live reactions (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await liveReactions.toggleLiveReactions(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.liveReactionsEnabled).toBe(false);
  });

  it('returns the available reactions (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await liveReactions.getAvailableReactions(makeReq(), res);
    expect(res.body.reactions).toHaveLength(8);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ liveReactionsSettings: { liveReactionsEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await liveReactions.resetLiveReactionsSettings(makeReq(), res);
    expect(res.body.settings.liveReactionsEnabled).toBe(true); // default
  });
});

describe('liveReactionsController — reactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects sendLiveReaction without emoji/conversation (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '❤️' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Emoji and conversation ID are required');
  });

  it('rejects sending when reactions are disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ liveReactionsSettings: { liveReactionsEnabled: false } }));
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '❤️', conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects an unsupported emoji (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '🤖', conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid reaction emoji');
  });

  it('rejects sending to a conversation the user is not in (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ participants: ['user-9'] });
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '❤️', conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Not authorized for this conversation');
  });

  it('rejects a reaction to a missing message (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '❤️', conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Message not found');
  });

  it('sends a live reaction and persists it (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    const message = { _id: 'm1', conversationId: 'c1', liveReactions: [], save: jest.fn().mockResolvedValue(undefined) };
    Message.findById.mockResolvedValue(message);
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '❤️', conversationId: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(message.liveReactions).toHaveLength(1);
    expect(message.liveReactions[0].emoji).toBe('❤️');
    expect(message.save).toHaveBeenCalled();
  });

  it('caps reactions per message by dropping the oldest', async () => {
    User.findById.mockResolvedValue(makeUser({ liveReactionsSettings: { maxReactionsPerMessage: 2 } }));
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    const existing = [
      { _id: 'r1', userId: 'user-1', expiresAt: null },
      { _id: 'r2', userId: 'user-1', expiresAt: null }
    ];
    const message = { _id: 'm1', conversationId: 'c1', liveReactions: existing, save: jest.fn().mockResolvedValue(undefined) };
    Message.findById.mockResolvedValue(message);
    const res = makeRes();
    await liveReactions.sendLiveReaction(makeReq({ params: { messageId: 'm1' }, body: { emoji: '👍', conversationId: 'c1' } }), res);
    expect(message.liveReactions).toHaveLength(2);
    expect(message.liveReactions[0]._id).not.toBe('r1');
  });

  it('returns 404 for reactions on a missing message', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await liveReactions.getMessageReactions(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('filters expired reactions when reading (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue({
      liveReactions: [
        { _id: 'r1', expiresAt: new Date(Date.now() - 1000) },
        { _id: 'r2', expiresAt: new Date(Date.now() + 60000) }
      ]
    });
    const res = makeRes();
    await liveReactions.getMessageReactions(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.body.reactions).toHaveLength(1);
    expect(res.body.reactions[0]._id).toBe('r2');
  });

  it('returns 404 when removing a missing reaction', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue({ liveReactions: [] });
    const res = makeRes();
    await liveReactions.removeLiveReaction(makeReq({ params: { messageId: 'm1', reactionId: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('removes only the user\'s own reaction (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const message = {
      liveReactions: [
        { _id: 'r1', userId: 'user-2' },
        { _id: 'r2', userId: 'user-1' }
      ],
      save: jest.fn().mockResolvedValue(undefined)
    };
    Message.findById.mockResolvedValue(message);
    const res = makeRes();
    await liveReactions.removeLiveReaction(makeReq({ params: { messageId: 'm1', reactionId: 'r2' } }), res);
    expect(res.body.success).toBe(true);
    expect(message.liveReactions).toHaveLength(1);
    expect(message.liveReactions[0]._id).toBe('r1');
  });

  it('cleans up expired reactions (happy path)', async () => {
    Message.updateMany.mockResolvedValue({ modifiedCount: 3 });
    const res = makeRes();
    await liveReactions.cleanupExpiredReactions(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Cleaned up expired reactions from 3 messages');
  });
});
