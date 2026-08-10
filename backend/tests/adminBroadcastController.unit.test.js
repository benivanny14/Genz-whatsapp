jest.mock('../models/Broadcast', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/User', () => ({
  find: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Message', () => ({
  create: jest.fn()
}));

jest.mock('../models/PushSubscription', () => ({
  countDocuments: jest.fn()
}));

jest.mock('../services/notificationService', () => ({
  sendToUsers: jest.fn(),
  sendBroadcastNotification: jest.fn()
}));

jest.mock('../utils/systemUser', () => ({
  getOrCreateSystemUser: jest.fn(),
  SYSTEM_DEVICE_ID: 'system-device-id'
}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const Broadcast = require('../models/Broadcast');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const PushSubscription = require('../models/PushSubscription');
const notificationService = require('../services/notificationService');
const { getOrCreateSystemUser } = require('../utils/systemUser');
const { logAdminAction } = require('../utils/auditLogger');
const adminBroadcast = require('../controllers/adminBroadcastController');

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
  admin: { id: 'admin-1' },
  app: { get: jest.fn(() => null) },
  ...overrides
});

// User.find is chained with .select('_id').lean() in sendSystemAnnouncement /
// sendPushNotification, so the mock must return an object exposing those methods.
const mockUserFindChain = (users) => ({
  select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(users) }))
});

describe('adminBroadcastController — broadcast lists', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists broadcasts with pagination (happy path)', async () => {
    Broadcast.countDocuments.mockResolvedValue(45);
    const broadcasts = [{ _id: 'b1' }];
    const chain = {
      sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(broadcasts) }) }) })
    };
    Broadcast.find.mockReturnValue(chain);
    const res = makeRes();
    await adminBroadcast.listBroadcasts(makeReq({ query: { page: '2' } }), res);
    expect(res.body.pagination).toEqual({ page: 2, limit: 30, total: 45, pages: 2 });
    expect(res.body.broadcasts).toHaveLength(1);
  });

  it('returns 500 when listing broadcasts fails (error)', async () => {
    Broadcast.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminBroadcast.listBroadcasts(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

  it('deletes a broadcast and logs the action (happy path)', async () => {
    const broadcast = { _id: 'b1', deleteOne: jest.fn().mockResolvedValue({}) };
    Broadcast.findById.mockResolvedValue(broadcast);
    const res = makeRes();
    await adminBroadcast.deleteBroadcast(makeReq({ params: { id: 'b1' } }), res);
    expect(broadcast.deleteOne).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'admin_deleted_broadcast', expect.anything(), null, null, expect.anything());
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the broadcast is not found (auth)', async () => {
    Broadcast.findById.mockResolvedValue(null);
    const res = makeRes();
    await adminBroadcast.deleteBroadcast(makeReq({ params: { id: 'missing' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('adminBroadcastController — system announcements', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an announcement without content (validation)', async () => {
    const res = makeRes();
    await adminBroadcast.sendSystemAnnouncement(makeReq({ body: { content: '   ' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('sends an announcement to all users (happy path)', async () => {
    User.find.mockReturnValue(mockUserFindChain([{ _id: 'u1' }, { _id: 'u2' }]));
    getOrCreateSystemUser.mockResolvedValue({ _id: 'sys-1' });
    Conversation.findOne.mockResolvedValue({ _id: 'c1', lastMessage: null, save: jest.fn().mockResolvedValue({}) });
    Message.create.mockResolvedValue({ _id: 'm1' });

    const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    const res = makeRes();
    await adminBroadcast.sendSystemAnnouncement(
      makeReq({ body: { content: 'Hello everyone' }, app: { get: jest.fn(() => io) } }),
      res
    );
    expect(User.find).toHaveBeenCalledWith({ deviceId: { $ne: 'system-device-id' } });
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ messageType: 'system' }));
    expect(res.body.sent).toBe(2);
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'admin_sent_system_announcement', expect.anything(), null, null, expect.anything());
  });

  it('creates a new conversation when none exists (happy path)', async () => {
    User.find.mockReturnValue(mockUserFindChain([{ _id: 'u1' }]));
    getOrCreateSystemUser.mockResolvedValue({ _id: 'sys-1' });
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue({ _id: 'new-c1', lastMessage: null, save: jest.fn().mockResolvedValue({}) });
    Message.create.mockResolvedValue({ _id: 'm1' });

    const res = makeRes();
    await adminBroadcast.sendSystemAnnouncement(makeReq({ body: { content: 'Hi' } }), res);
    expect(Conversation.create).toHaveBeenCalledWith({ participants: ['sys-1', 'u1'], isGroup: false });
    expect(res.body.sent).toBe(1);
  });

  it('filters recipients by segment (happy path)', async () => {
    User.find.mockReturnValue(mockUserFindChain([{ _id: 'u1' }]));
    getOrCreateSystemUser.mockResolvedValue({ _id: 'sys-1' });
    Conversation.findOne.mockResolvedValue({ _id: 'c1', lastMessage: null, save: jest.fn().mockResolvedValue({}) });
    Message.create.mockResolvedValue({ _id: 'm1' });

    const res = makeRes();
    await adminBroadcast.sendSystemAnnouncement(makeReq({ body: { content: 'Premium only', segment: 'premium' } }), res);
    expect(User.find).toHaveBeenCalledWith({ deviceId: { $ne: 'system-device-id' }, premium: true });
  });

  it('keeps counting even when one recipient fails (error path)', async () => {
    User.find.mockReturnValue(mockUserFindChain([{ _id: 'u1' }, { _id: 'u2' }]));
    getOrCreateSystemUser.mockResolvedValue({ _id: 'sys-1' });
    Conversation.findOne.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminBroadcast.sendSystemAnnouncement(makeReq({ body: { content: 'Hi' } }), res);
    expect(res.body.sent).toBe(0);
    expect(res.body.success).toBe(true);
  });

  it('returns 500 when sending an announcement fails (error)', async () => {
    User.find.mockImplementation(() => {
      throw new Error('db down');
    });
    const res = makeRes();
    await adminBroadcast.sendSystemAnnouncement(makeReq({ body: { content: 'Hi' } }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminBroadcastController — notification center', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the notification overview (happy path)', async () => {
    PushSubscription.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7);
    const res = makeRes();
    await adminBroadcast.getNotificationOverview(makeReq(), res);
    expect(res.body.overview).toEqual({ totalSubscriptions: 10, enabledSubscriptions: 7 });
  });

  it('returns 500 when the overview fails (error)', async () => {
    PushSubscription.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminBroadcast.getNotificationOverview(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

  it('rejects a push notification without title/body (validation)', async () => {
    const res = makeRes();
    await adminBroadcast.sendPushNotification(makeReq({ body: { title: 'T' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('broadcasts to all users when segment is all (happy path)', async () => {
    notificationService.sendBroadcastNotification.mockResolvedValue({ sent: 3 });
    const res = makeRes();
    await adminBroadcast.sendPushNotification(
      makeReq({ body: { title: 'T', body: 'B' } }),
      res
    );
    expect(notificationService.sendBroadcastNotification).toHaveBeenCalledWith(
      { title: 'T', body: 'B', icon: '/icons/icon-192.png' },
      { url: '/' }
    );
    expect(res.body.result).toEqual({ sent: 3 });
  });

  it('targets a segment by resolving user ids (happy path)', async () => {
    User.find.mockReturnValue(mockUserFindChain([{ _id: 'u1' }, { _id: 'u2' }]));
    notificationService.sendToUsers.mockResolvedValue({ sent: 2 });
    const res = makeRes();
    await adminBroadcast.sendPushNotification(
      makeReq({ body: { title: 'T', body: 'B', segment: 'premium' } }),
      res
    );
    expect(User.find).toHaveBeenCalledWith({ premium: true });
    expect(notificationService.sendToUsers).toHaveBeenCalledWith(
      ['u1', 'u2'],
      expect.objectContaining({ title: 'T' }),
      { url: '/' }
    );
    expect(res.body.success).toBe(true);
  });

  it('returns 500 when sending a push notification fails (error)', async () => {
    notificationService.sendBroadcastNotification.mockRejectedValue(new Error('push down'));
    const res = makeRes();
    await adminBroadcast.sendPushNotification(makeReq({ body: { title: 'T', body: 'B' } }), res);
    expect(res.statusCode).toBe(500);
  });
});
