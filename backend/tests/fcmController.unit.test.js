jest.mock('../services/notificationService', () => ({
  registerToken: jest.fn(),
  unregisterToken: jest.fn(),
  subscribeUserToTopic: jest.fn(),
  unsubscribeUserFromTopic: jest.fn()
}));

const {
  registerToken,
  unregisterToken,
  subscribeUserToTopic,
  unsubscribeUserFromTopic
} = require('../services/notificationService');
const fcm = require('../controllers/fcmController');

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

beforeEach(() => jest.clearAllMocks());

describe('fcmController — registerToken', () => {
  it('returns 400 when the token is missing (validation)', async () => {
    const res = makeRes();
    await fcm.registerToken(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('FCM token is required');
    expect(registerToken).not.toHaveBeenCalled();
  });

  it('registers the token (happy path)', async () => {
    registerToken.mockResolvedValue({ success: true });
    const res = makeRes();
    await fcm.registerToken(makeReq({ body: { token: 'fcm-token-1' } }), res);
    expect(registerToken).toHaveBeenCalledWith('user-1', 'fcm-token-1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when the service reports failure', async () => {
    registerToken.mockResolvedValue({ success: false, message: 'invalid token' });
    const res = makeRes();
    await fcm.registerToken(makeReq({ body: { token: 'bad' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('invalid token');
  });

  it('returns 500 when the service throws', async () => {
    registerToken.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await fcm.registerToken(makeReq({ body: { token: 'x' } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('boom');
  });
});

describe('fcmController — unregisterToken', () => {
  it('returns 400 when the token is missing (validation)', async () => {
    const res = makeRes();
    await fcm.unregisterToken(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('FCM token is required');
  });

  it('unregisters the token (happy path)', async () => {
    unregisterToken.mockResolvedValue({ success: true });
    const res = makeRes();
    await fcm.unregisterToken(makeReq({ body: { token: 'fcm-token-1' } }), res);
    expect(unregisterToken).toHaveBeenCalledWith('user-1', 'fcm-token-1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when the service reports failure', async () => {
    unregisterToken.mockResolvedValue({ success: false, message: 'unknown token' });
    const res = makeRes();
    await fcm.unregisterToken(makeReq({ body: { token: 'x' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when the service throws', async () => {
    unregisterToken.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await fcm.unregisterToken(makeReq({ body: { token: 'x' } }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('fcmController — subscribeToTopic', () => {
  it('returns 400 when the topic is missing (validation)', async () => {
    const res = makeRes();
    await fcm.subscribeToTopic(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Topic is required');
    expect(subscribeUserToTopic).not.toHaveBeenCalled();
  });

  it('subscribes to the topic (happy path)', async () => {
    subscribeUserToTopic.mockResolvedValue({ success: true, successCount: 2 });
    const res = makeRes();
    await fcm.subscribeToTopic(makeReq({ body: { topic: 'news' } }), res);
    expect(subscribeUserToTopic).toHaveBeenCalledWith('user-1', 'news');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Subscribed to topic news successfully');
    expect(res.body.successCount).toBe(2);
  });

  it('returns 400 when the service reports failure', async () => {
    subscribeUserToTopic.mockResolvedValue({ success: false, message: 'topic banned' });
    const res = makeRes();
    await fcm.subscribeToTopic(makeReq({ body: { topic: 'news' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('topic banned');
  });

  it('returns 500 when the service throws', async () => {
    subscribeUserToTopic.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await fcm.subscribeToTopic(makeReq({ body: { topic: 'news' } }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('fcmController — unsubscribeFromTopic', () => {
  it('returns 400 when the topic is missing (validation)', async () => {
    const res = makeRes();
    await fcm.unsubscribeFromTopic(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Topic is required');
    expect(unsubscribeUserFromTopic).not.toHaveBeenCalled();
  });

  it('unsubscribes from the topic (happy path)', async () => {
    unsubscribeUserFromTopic.mockResolvedValue({ success: true, successCount: 1 });
    const res = makeRes();
    await fcm.unsubscribeFromTopic(makeReq({ body: { topic: 'news' } }), res);
    expect(unsubscribeUserFromTopic).toHaveBeenCalledWith('user-1', 'news');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Unsubscribed from topic news successfully');
    expect(res.body.successCount).toBe(1);
  });

  it('returns 400 when the service reports failure', async () => {
    unsubscribeUserFromTopic.mockResolvedValue({ success: false, message: 'not subscribed' });
    const res = makeRes();
    await fcm.unsubscribeFromTopic(makeReq({ body: { topic: 'news' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when the service throws', async () => {
    unsubscribeUserFromTopic.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await fcm.unsubscribeFromTopic(makeReq({ body: { topic: 'news' } }), res);
    expect(res.statusCode).toBe(500);
  });
});
