jest.mock('../models/PushSubscription', () => ({
  findOneAndUpdate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../services/notificationService', () => ({
  sendToUser: jest.fn()
}));

const PushSubscription = require('../models/PushSubscription');
const notificationService = require('../services/notificationService');
const notification = require('../controllers/notificationController');

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
  headers: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const validSubscription = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' }
};

describe('notificationController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the VAPID public key (happy path)', () => {
    process.env.VAPID_PUBLIC_KEY = 'vapid-key';
    const res = makeRes();
    notification.getVapidPublicKey(makeReq(), res);
    expect(res.body.publicKey).toBe('vapid-key');
  });

  it('returns 401 for subscribe without a user (auth)', async () => {
    const res = makeRes();
    await notification.subscribe(makeReq({ user: null, body: validSubscription }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Authentication required');
  });

  it('rejects a subscription without keys (validation)', async () => {
    const res = makeRes();
    await notification.subscribe(makeReq({ body: { endpoint: 'https://x' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('A valid browser push subscription is required');
  });

  it('upserts a push subscription (happy path)', async () => {
    PushSubscription.findOneAndUpdate.mockResolvedValue({ endpoint: validSubscription.endpoint });
    const res = makeRes();
    await notification.subscribe(makeReq({ body: validSubscription, headers: { 'x-device-id': 'dev-1', 'user-agent': 'chrome' } }), res);
    expect(res.body.success).toBe(true);
    expect(PushSubscription.findOneAndUpdate).toHaveBeenCalledWith(
      { endpoint: validSubscription.endpoint },
      expect.objectContaining({ $set: expect.objectContaining({ userId: 'user-1', enabled: true }) }),
      expect.objectContaining({ upsert: true })
    );
  });

  it('rejects unsubscribe without an endpoint (validation)', async () => {
    const res = makeRes();
    await notification.unsubscribe(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Endpoint is required');
  });

  it('disables a push subscription (happy path)', async () => {
    PushSubscription.findOneAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await notification.unsubscribe(makeReq({ body: { endpoint: 'https://x' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Push subscription disabled');
  });

  it('lists the user\'s subscriptions (happy path)', async () => {
    PushSubscription.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ endpoint: 'https://x' }])
    });
    const res = makeRes();
    await notification.listSubscriptions(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.subscriptions).toHaveLength(1);
  });

  it('sends a test notification (happy path)', async () => {
    notificationService.sendToUser.mockResolvedValue({ success: true });
    const res = makeRes();
    await notification.sendTestNotification(makeReq({ body: { body: 'Hello!' } }), res);
    expect(res.body.success).toBe(true);
    expect(notificationService.sendToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'test' }),
      { type: 'test' }
    );
  });

  it('reports a failed test notification (happy path)', async () => {
    notificationService.sendToUser.mockResolvedValue({ success: false, error: 'nope' });
    const res = makeRes();
    await notification.sendTestNotification(makeReq(), res);
    expect(res.body.success).toBe(false);
  });
});
