jest.mock('../models/Message', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Status', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/Broadcast', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn()
}));

jest.mock('../utils/circuitBreaker', () => ({
  circuit: jest.fn(async (name, opts, fn) => fn())
}));

jest.mock('../utils/responseCache', () => ({
  cached: jest.fn(async (key, ttl, fn) => fn())
}));

jest.mock('../utils/networkGuard', () => ({
  assertSafeExternalUrl: jest.fn(async (url) => new URL(url))
}));

jest.mock('../utils/messageSerializer', () => ({
  serializeOutgoingMessage: jest.fn((m) => m)
}));

jest.mock('../utils/messageSendHelpers', () => ({
  isEitherUserBlocked: jest.fn(async () => false)
}));

jest.mock('../services/notificationService', () => ({
  sendNewMessageNotification: jest.fn(async () => undefined)
}));

jest.mock('../utils/locationData', () => ({
  normalizeLocationData: jest.fn((d) => d || {})
}));

jest.mock('../config/cloudinary', () => ({
  uploadFile: jest.fn(),
  getFileType: jest.fn(),
  isConfigured: jest.fn(() => false)
}));

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const User = require('../models/User');
const axios = require('axios');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');
const advanced = require('../controllers/advancedController');

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
  res.setHeader = jest.fn();
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: { _id: 'user-1', username: 'alice' },
  protocol: 'http',
  get: jest.fn(() => 'localhost:5000'),
  app: { get: jest.fn(() => null) }, // no socket.io in tests
  ...overrides
});

const makeStatus = (overrides = {}) => ({
  _id: 's-1',
  userId: 'user-1',
  user: 'user-1',
  username: 'alice',
  type: 'text',
  content: 'Hello',
  caption: '',
  mediaUrl: '',
  mediaType: 'text',
  privacy: 'everyone',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  views: [],
  viewsCount: 0,
  likes: [],
  likesCount: 0,
  saves: [],
  savesCount: 0,
  shares: [],
  shareCount: 0,
  reshares: [],
  save: jest.fn().mockResolvedValue(undefined),
  toObject() {
    return { _id: this._id, userId: this.userId, content: this.content, privacy: this.privacy };
  },
  ...overrides
});

const makeBroadcast = (overrides = {}) => ({
  _id: 'b-1',
  name: 'Fans',
  description: '',
  createdBy: 'user-1',
  recipients: ['user-2'],
  message: 'Broadcast list created',
  status: 'active',
  messageCount: 0,
  deliveredCount: 0,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('advancedController — translateMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('translates by message ID lookup (happy path)', async () => {
    axios.post.mockRejectedValue(new Error('network down'));
    Message.findById.mockResolvedValue({ content: 'hello from message' });
    const res = makeRes();
    await advanced.translateMessage(makeReq({ body: { messageId: 'm-1', targetLanguage: 'sw' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.translatedText).toBe('[Swahili] hello from message');
  });

  it('rejects without text or messageId (validation)', async () => {
    const res = makeRes();
    await advanced.translateMessage(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Text or messageId is required');
  });

  it('returns 404 when the message is missing', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.translateMessage(makeReq({ body: { messageId: 'm-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('falls back to local translation when the provider fails', async () => {
    axios.post.mockRejectedValue(new Error('network down'));
    const res = makeRes();
    await advanced.translateMessage(makeReq({ body: { text: 'hello', target: 'sw' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.translatedText).toBe('[Swahili] hello');
  });

  it('returns provider translation on success (happy path)', async () => {
    axios.post.mockResolvedValue({ data: { translatedText: 'Hola' } });
    const res = makeRes();
    await advanced.translateMessage(makeReq({ body: { text: 'hello', target: 'es' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.translatedText).toBe('Hola');
    expect(res.body.targetLanguage).toBe('es');
  });
});

describe('advancedController — dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns dashboard stats (happy path)', async () => {
    Message.countDocuments.mockResolvedValue(3);
    Conversation.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
    Message.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['c1', 'c2']) });
    Status.countDocuments.mockResolvedValue(2);
    const res = makeRes();
    await advanced.getDashboardStats(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.stats.messagesToday).toBe(3);
    expect(res.body.stats.chatsCount).toBe(0);
    expect(res.body.stats.chatsTodayCount).toBe(2);
    expect(res.body.stats.activeStatuses).toBe(2);
    expect(res.body.stats.dailyChart).toHaveLength(7);
  });
});

describe('advancedController — status reel & ranking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('groups statuses into a reel (happy path)', async () => {
    Status.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 's1', userId: 'user-1', username: 'alice', createdAt: new Date(), privacy: 'everyone' },
        { _id: 's2', userId: 'user-1', username: 'alice', createdAt: new Date(), privacy: 'everyone' }
      ])
    });
    const res = makeRes();
    await advanced.getStatusReel(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.reel).toHaveLength(1); // grouped by user
    expect(res.body.reel[0].statuses).toHaveLength(2);
  });

  it('ranks users with online first (happy path)', async () => {
    User.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 'u1', username: 'bob', isOnline: true, lastSeen: new Date(), profilePicture: null, status: 'online' },
        { _id: 'u2', username: 'carol', isOnline: false, lastSeen: new Date(), profilePicture: null, status: 'offline' }
      ])
    });
    const res = makeRes();
    await advanced.getOnlineRanking(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ranking).toHaveLength(2);
    expect(res.body.ranking[0].username).toBe('bob');
    expect(res.body.ranking[0].rank).toBe(1);
  });
});

describe('advancedController — scheduled messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for an unknown conversation', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.scheduleMessage(makeReq({ body: { conversationId: 'c-1', content: 'hi', scheduledFor: '2099-01-01' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects when not a participant (403)', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'c-1', participants: ['user-9'] });
    const res = makeRes();
    await advanced.scheduleMessage(makeReq({ body: { conversationId: 'c-1', content: 'hi', scheduledFor: '2099-01-01' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects scheduling in the past (validation)', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'c-1', participants: ['user-1'] });
    const res = makeRes();
    await advanced.scheduleMessage(makeReq({ body: { conversationId: 'c-1', content: 'hi', scheduledFor: '2020-01-01' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Scheduled time must be in the future');
  });

  it('schedules a message (happy path)', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'c-1', participants: ['user-1'] });
    Message.create.mockResolvedValue({ _id: 'm-1' });
    const populated = { _id: 'm-1', content: 'hi', isScheduled: true };
    Message.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(populated) });
    const res = makeRes();
    await advanced.scheduleMessage(makeReq({ body: { conversationId: 'c-1', content: 'hi', scheduledFor: '2099-01-01' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.message.isScheduled).toBe(true);
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ isScheduled: true }));
  });

  it('lists scheduled messages (happy path)', async () => {
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ _id: 'm-1', isScheduled: true }])
    });
    const res = makeRes();
    await advanced.getScheduledMessages(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });

  it('returns 404 when cancelling an unknown message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.cancelScheduledMessage(makeReq({ params: { id: 'm-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects cancelling someone else\'s message (403)', async () => {
    Message.findById.mockResolvedValue({ _id: 'm-1', sender: 'user-9' });
    const res = makeRes();
    await advanced.cancelScheduledMessage(makeReq({ params: { id: 'm-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('cancels a scheduled message (happy path)', async () => {
    Message.findById.mockResolvedValue({ _id: 'm-1', sender: 'user-1' });
    Message.findByIdAndDelete.mockResolvedValue({});
    const res = makeRes();
    await advanced.cancelScheduledMessage(makeReq({ params: { id: 'm-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(Message.findByIdAndDelete).toHaveBeenCalledWith('m-1');
  });
});

describe('advancedController — statuses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid status type (validation)', async () => {
    const res = makeRes();
    await advanced.createStatus(makeReq({ body: { type: 'hologram' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid status type');
  });

  it('requires a media URL for media types (validation)', async () => {
    const res = makeRes();
    await advanced.createStatus(makeReq({ body: { type: 'image' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Media URL is required/i);
  });

  it('creates a status (happy path)', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ statusFeaturesSettings: {}, settings: {} })
    });
    Status.create.mockResolvedValue(makeStatus());
    const res = makeRes();
    await advanced.createStatus(makeReq({ body: { type: 'text', content: 'Hello world' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.status.type).toBe('text');
    expect(Status.create).toHaveBeenCalledWith(expect.objectContaining({ privacy: 'contacts' }));
  });

  it('lists statuses filtered by privacy (happy path)', async () => {
    Status.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([makeStatus()])
    });
    const res = makeRes();
    await advanced.getStatuses(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.statuses).toHaveLength(1);
  });

  it('returns 404 when viewing an unknown status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.viewStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for an expired status', async () => {
    Status.findById.mockResolvedValue(makeStatus({ expiresAt: new Date(Date.now() - 1000) }));
    const res = makeRes();
    await advanced.viewStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Status has expired');
  });

  it('blocks viewing an only_me status by others (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ privacy: 'only_me', userId: 'user-2' }));
    const res = makeRes();
    await advanced.viewStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('records a view from a non-owner (happy path)', async () => {
    const status = makeStatus({ userId: 'user-2' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await advanced.viewStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(status.views).toHaveLength(1);
    expect(status.viewsCount).toBe(1);
    expect(status.save).toHaveBeenCalled();
  });

  it('does not count the owner as a viewer (happy path)', async () => {
    const status = makeStatus({ userId: 'user-1' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await advanced.viewStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(status.views).toHaveLength(0);
  });

  it('returns 404 when liking an unknown status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.likeStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('likes and unlikes a status (happy path)', async () => {
    const status = makeStatus({ userId: 'user-2' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await advanced.likeStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.body.liked).toBe(true);
    expect(status.likesCount).toBe(1);

    Status.findById.mockResolvedValue(status);
    const res2 = makeRes();
    await advanced.likeStatus(makeReq({ params: { id: 's-1' } }), res2);
    expect(res2.body.liked).toBe(false);
    expect(status.likesCount).toBe(0);
  });

  it('saves a status (happy path)', async () => {
    const status = makeStatus({ userId: 'user-2' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await advanced.saveStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.saved).toBe(true);
    expect(status.savesCount).toBe(1);
  });

  it('shares a status (happy path)', async () => {
    const status = makeStatus({ userId: 'user-2' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await advanced.shareStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sharesCount).toBe(1);
  });

  it('returns 404 when resharing an unknown status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.reshareStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('reshares a status (happy path)', async () => {
    const original = makeStatus({ userId: 'user-2' });
    Status.findById.mockResolvedValue(original);
    Status.create.mockResolvedValue(makeStatus({ _id: 's-2' }));
    const res = makeRes();
    await advanced.reshareStatus(makeReq({ params: { id: 's-1' } }), res);
    expect(res.statusCode).toBe(201);
    expect(Status.create).toHaveBeenCalledWith(expect.objectContaining({ privacy: 'everyone' }));
    expect(original.save).toHaveBeenCalled();
  });
});

describe('advancedController — broadcasts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a broadcast without a name (validation)', async () => {
    const res = makeRes();
    await advanced.createBroadcast(makeReq({ body: { recipients: ['user-2'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Broadcast name is required');
  });

  it('rejects a broadcast without recipients (validation)', async () => {
    const res = makeRes();
    await advanced.createBroadcast(makeReq({ body: { name: 'Fans' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Select at least one recipient');
  });

  it('creates a broadcast (happy path)', async () => {
    Broadcast.create.mockResolvedValue(makeBroadcast());
    Broadcast.findById.mockResolvedValue(makeBroadcast());
    const res = makeRes();
    await advanced.createBroadcast(makeReq({ body: { name: 'Fans', recipients: ['user-2', 'user-1'] } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.broadcast.name).toBe('Fans');
    // current user filtered out of recipients
    expect(Broadcast.create).toHaveBeenCalledWith(expect.objectContaining({ recipients: ['user-2'] }));
  });

  it('lists broadcasts (happy path)', async () => {
    Broadcast.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([makeBroadcast()]) });
    const res = makeRes();
    await advanced.getBroadcasts(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.broadcasts).toHaveLength(1);
  });

  it('returns 404 when updating an unknown broadcast', async () => {
    Broadcast.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.updateBroadcast(makeReq({ params: { id: 'b-1' }, body: { name: 'X' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects updating another user\'s broadcast (403)', async () => {
    Broadcast.findById.mockResolvedValue(makeBroadcast({ createdBy: 'user-9' }));
    const res = makeRes();
    await advanced.updateBroadcast(makeReq({ params: { id: 'b-1' }, body: { name: 'X' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('updates a broadcast (happy path)', async () => {
    const broadcast = makeBroadcast();
    Broadcast.findById.mockResolvedValueOnce(broadcast).mockResolvedValueOnce(broadcast);
    const res = makeRes();
    await advanced.updateBroadcast(makeReq({ params: { id: 'b-1' }, body: { name: 'VIP', status: 'inactive' } }), res);
    expect(res.statusCode).toBe(200);
    expect(broadcast.name).toBe('VIP');
    expect(broadcast.status).toBe('inactive');
    expect(broadcast.save).toHaveBeenCalled();
  });

  it('rejects deleting another user\'s broadcast (403)', async () => {
    Broadcast.findById.mockResolvedValue(makeBroadcast({ createdBy: 'user-9' }));
    const res = makeRes();
    await advanced.deleteBroadcast(makeReq({ params: { id: 'b-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deletes a broadcast (happy path)', async () => {
    Broadcast.findById.mockResolvedValue(makeBroadcast());
    Broadcast.findByIdAndDelete.mockResolvedValue({});
    const res = makeRes();
    await advanced.deleteBroadcast(makeReq({ params: { id: 'b-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(Broadcast.findByIdAndDelete).toHaveBeenCalledWith('b-1');
  });

  it('returns 404 when sending to an unknown broadcast', async () => {
    Broadcast.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.sendBroadcastMessage(makeReq({ params: { id: 'b-1' }, body: { content: 'hi' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects empty broadcast content (validation)', async () => {
    Broadcast.findById.mockResolvedValue(makeBroadcast());
    const res = makeRes();
    await advanced.sendBroadcastMessage(makeReq({ params: { id: 'b-1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('sends a broadcast message (happy path)', async () => {
    const broadcast = makeBroadcast();
    Broadcast.findById.mockResolvedValue(broadcast);
    isEitherUserBlocked.mockResolvedValue(false);
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue({ _id: 'c-1', save: jest.fn().mockResolvedValue(undefined) });
    Message.create.mockResolvedValue({ _id: 'm-1' });
    Message.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ _id: 'm-1', sender: { username: 'alice' } }) });
    const res = makeRes();
    await advanced.sendBroadcastMessage(makeReq({ params: { id: 'b-1' }, body: { content: 'Big news!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.messageCount).toBe(1);
    expect(res.body.deliveryResults[0].success).toBe(true);
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'Big news!' }));
  });
});

describe('advancedController — disappearing messages & search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for an unknown conversation', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await advanced.setDisappearingMessages(makeReq({ params: { id: 'c-1' }, body: { timer: 24 } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects when not a participant (403)', async () => {
    Conversation.findById.mockResolvedValue({ _id: 'c-1', participants: ['user-9'] });
    const res = makeRes();
    await advanced.setDisappearingMessages(makeReq({ params: { id: 'c-1' }, body: { timer: 24 } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('sets disappearing messages (happy path)', async () => {
    const conversation = { _id: 'c-1', participants: ['user-1'], save: jest.fn().mockResolvedValue(undefined) };
    Conversation.findById.mockResolvedValue(conversation);
    const res = makeRes();
    await advanced.setDisappearingMessages(makeReq({ params: { id: 'c-1' }, body: { timer: 24 } }), res);
    expect(res.statusCode).toBe(200);
    expect(conversation.disappearingMessages.enabled).toBe(true);
    expect(conversation.disappearingMessages.timer).toBe(24);
    expect(conversation.save).toHaveBeenCalled();
  });

  it('turns disappearing messages off (validation)', async () => {
    const conversation = { _id: 'c-1', participants: ['user-1'], save: jest.fn().mockResolvedValue(undefined) };
    Conversation.findById.mockResolvedValue(conversation);
    const res = makeRes();
    await advanced.setDisappearingMessages(makeReq({ params: { id: 'c-1' }, body: { enabled: false } }), res);
    expect(conversation.disappearingMessages.enabled).toBe(false);
  });

  it('rejects search without a query (validation)', async () => {
    const res = makeRes();
    await advanced.searchMessages(makeReq({ query: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects search in a conversation the user is not in (403)', async () => {
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ participants: ['user-9'] }) });
    const res = makeRes();
    await advanced.searchMessages(makeReq({ query: { query: 'hello', conversationId: 'c-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('searches messages (happy path)', async () => {
    Conversation.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'c-1' }, { _id: 'c-2' }]) });
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 'm-1', content: 'hello there' }])
    });
    const res = makeRes();
    await advanced.searchMessages(makeReq({ query: { query: 'hello' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });
});

describe('advancedController — link preview, gifs, ai', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GIPHY_API_KEY;
  });

  it('rejects link preview without a URL (validation)', async () => {
    const res = makeRes();
    await advanced.getLinkPreview(makeReq({ query: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('extracts Open Graph metadata (happy path)', async () => {
    axios.get.mockResolvedValue({
      data: '<html><head><title>Example</title><meta property="og:title" content="OG Title" /></head></html>'
    });
    const res = makeRes();
    await advanced.getLinkPreview(makeReq({ query: { url: 'https://example.com/post' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.preview.title).toBe('OG Title');
    expect(res.body.preview.domain).toBe('example.com');
  });

  it('falls back to a graceful preview on fetch failure', async () => {
    axios.get.mockRejectedValue(new Error('timeout'));
    const res = makeRes();
    await advanced.getLinkPreview(makeReq({ query: { url: 'https://example.com' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.preview.title).toBe('example.com');
  });

  it('serves the fallback GIF set without an API key', async () => {
    const res = makeRes();
    await advanced.getGifs(makeReq({ query: { limit: 3 } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fallback).toBe(true);
    expect(res.body.gifs).toHaveLength(3);
  });

  it('proxies Giphy when an API key is set (happy path)', async () => {
    process.env.GIPHY_API_KEY = 'test-key';
    axios.get.mockResolvedValue({ data: { data: [{ id: 'g1', title: 'Wave', images: {} }], pagination: { count: 1 } } });
    const res = makeRes();
    await advanced.getGifs(makeReq({ query: { q: 'wave', type: 'search' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fallback).toBe(false);
    expect(res.body.gifs).toHaveLength(1);
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('api.giphy.com'), expect.anything());
  });

  it('rejects aiAssistant without a prompt (validation)', async () => {
    const res = makeRes();
    await advanced.aiAssistant(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Prompt is required');
  });

  it('answers help requests (happy path)', async () => {
    const res = makeRes();
    await advanced.aiAssistant(makeReq({ body: { prompt: '/ai can you help me?' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.response).toMatch(/AI Assistant/);
  });

  it('answers greetings (happy path)', async () => {
    const res = makeRes();
    await advanced.aiAssistant(makeReq({ body: { prompt: 'hello there' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.response).toBe('Hello! 👋 How can I help you today?');
  });
});
