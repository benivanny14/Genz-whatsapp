jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  countDocuments: jest.fn(),
  find: jest.fn()
}));

const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const businessAccount = require('../controllers/businessAccountController');

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
  businessAccountSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('businessAccountController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await businessAccount.getBusinessAccountSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ businessAccountSettings: { businessName: 'GENZ Shop' } }));
    const res = makeRes();
    await businessAccount.getBusinessAccountSettings(makeReq(), res);
    expect(res.body.settings.businessName).toBe('GENZ Shop');
    expect(res.body.settings.businessAccountEnabled).toBe(false); // default
    expect(res.body.settings.businessHours.monday.enabled).toBe(true); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.updateBusinessAccountSettings(makeReq({ body: { settings: { awayMode: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.awayMode).toBe(true);
  });

  it('rejects enabling without name/category (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await businessAccount.enableBusinessAccount(makeReq({ body: { businessName: 'Shop' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Business name and category are required');
  });

  it('enables the business account (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.enableBusinessAccount(makeReq({ body: { businessName: 'GENZ Shop', businessCategory: 'Retail' } }), res);
    expect(res.body.settings.businessAccountEnabled).toBe(true);
    expect(res.body.settings.businessName).toBe('GENZ Shop');
    expect(user.save).toHaveBeenCalled();
  });

  it('disables the business account (happy path)', async () => {
    const user = makeUser({ businessAccountSettings: { businessAccountEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.disableBusinessAccount(makeReq(), res);
    expect(res.body.settings.businessAccountEnabled).toBe(false);
  });

  it('rejects updating hours without businessHours (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await businessAccount.updateBusinessHours(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Business hours are required');
  });

  it('updates business hours (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.updateBusinessHours(makeReq({ body: { businessHours: { monday: { open: '10:00', close: '16:00' } } } }), res);
    expect(res.body.settings.businessHours.monday.open).toBe('10:00');
  });

  it('updates the auto reply (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.updateAutoReply(makeReq({ body: { enabled: true, message: 'Karibu!' } }), res);
    expect(res.body.settings.autoReplies.enabled).toBe(true);
    expect(res.body.settings.autoReplies.message).toBe('Karibu!');
  });

  it('rejects adding a quick reply without keyword/message (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await businessAccount.addQuickReply(makeReq({ body: { keyword: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('adds a quick reply (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.addQuickReply(makeReq({ body: { keyword: 'price', message: 'Check catalog' } }), res);
    expect(res.body.quickReplies).toHaveLength(1);
    expect(res.body.quickReplies[0].keyword).toBe('price');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 404 when deleting a missing quick reply', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await businessAccount.deleteQuickReply(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a quick reply (happy path)', async () => {
    const user = makeUser({ businessAccountSettings: { quickReplies: [{ _id: 'qr1', keyword: 'hi' }] } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.deleteQuickReply(makeReq({ params: { id: 'qr1' } }), res);
    expect(res.body.quickReplies).toHaveLength(0);
  });

  it('toggles away mode (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.toggleAwayMode(makeReq({ body: { enabled: true, message: 'Back soon' } }), res);
    expect(res.body.settings.awayMode).toBe(true);
    expect(res.body.settings.awayMessage).toBe('Back soon');
  });

  it('rejects analytics when disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await businessAccount.getBusinessAnalytics(makeReq(), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Analytics is disabled');
  });

  it('returns analytics computed from the user\'s real data (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ businessAccountSettings: { analyticsEnabled: true } }));

    // Real data: 10 messages total, 5 conversations, 4 this week, 2 last week.
    Message.countDocuments
      .mockResolvedValueOnce(10)  // totalMessages
      .mockResolvedValueOnce(4)   // this week
      .mockResolvedValueOnce(2);  // last week
    Message.aggregate.mockResolvedValue([
      { _id: 10, count: 5 },
      { _id: 14, count: 3 }
    ]);
    Conversation.countDocuments.mockResolvedValue(5);

    // One conversation with an incoming message followed by the user replying
    // 20 minutes later → avg response time 20 minutes.
    Conversation.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'conv-1' }])
    });
    Message.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([
        { sender: 'other-user', createdAt: new Date(Date.now() - 60000) },
        { sender: 'user-1', createdAt: new Date(Date.now() - 60000 + 20 * 60000) }
      ])
    });

    const res = makeRes();
    await businessAccount.getBusinessAnalytics(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics.totalMessages).toBe(10);
    expect(res.body.analytics.totalConversations).toBe(5);
    expect(res.body.analytics.responseTime).toBe(20);
    expect(res.body.analytics.weeklyGrowth).toBe(100); // (4-2)/2 = +100%
    expect(res.body.analytics.peakHours).toEqual(['10:00', '14:00']);
    expect(res.body.analytics.customerSatisfaction).toBeNull(); // honest null, no rating data
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ businessAccountSettings: { businessAccountEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await businessAccount.resetBusinessAccountSettings(makeReq(), res);
    expect(res.body.settings.businessAccountEnabled).toBe(false); // default
  });
});
