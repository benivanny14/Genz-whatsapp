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
const dataUsage = require('../controllers/storageToolsController');

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
  dataUsageSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeMessage = (overrides = {}) => ({
  _id: 'm1',
  conversationId: 'conv-1',
  sender: 'user-1',
  content: 'hi',
  messageType: 'text',
  mediaUrl: null,
  createdAt: new Date(),
  ...overrides
});

describe('dataUsageController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await dataUsage.getDataUsageSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ dataUsageSettings: { dataLimitMB: 500 } }));
    const res = makeRes();
    await dataUsage.getDataUsageSettings(makeReq(), res);
    expect(res.body.settings.dataLimitMB).toBe(500);
    expect(res.body.settings.dataLimitEnabled).toBe(false); // default
    expect(res.body.settings.resetDate).toBe('monthly'); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await dataUsage.updateDataUsageSettings(makeReq({ body: { settings: { trackMobileData: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.trackMobileData).toBe(false);
  });

  it('toggles tracking (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await dataUsage.toggleDataUsageTracking(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.dataUsageTrackingEnabled).toBe(false);
  });

  it('sets the data limit (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await dataUsage.setDataLimit(makeReq({ body: { enabled: true, limitMB: 2000, warnAtPercentage: 90 } }), res);
    expect(res.body.settings.dataLimitEnabled).toBe(true);
    expect(res.body.settings.dataLimitMB).toBe(2000);
    expect(res.body.settings.warnAtPercentage).toBe(90);
  });

  it('toggles the data saver (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await dataUsage.toggleDataSaver(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.enableDataSaver).toBe(true);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ dataUsageSettings: { dataLimitMB: 1 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await dataUsage.resetDataUsageSettings(makeReq(), res);
    expect(res.body.settings.dataLimitMB).toBe(1000); // default
  });
});

describe('dataUsageController — stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects stats when tracking is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ dataUsageSettings: { dataUsageTrackingEnabled: false } }));
    const res = makeRes();
    await dataUsage.getDataUsageStats(makeReq(), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Data usage tracking is disabled');
  });

  it('computes usage stats (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    Message.find.mockResolvedValue([
      makeMessage({ mediaUrl: 'https://x/i.jpg', messageType: 'image' }),
      makeMessage({ mediaUrl: 'https://x/v.mp4', messageType: 'video' }),
      makeMessage({})
    ]);
    const res = makeRes();
    await dataUsage.getDataUsageStats(makeReq({ query: { period: 'daily' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.messageCount).toBe(3);
    expect(res.body.stats.mediaCount).toBe(2);
    expect(res.body.stats.textCount).toBe(1);
    expect(res.body.stats.byType.images).toBe(2);
    expect(res.body.stats.byType.videos).toBe(5);
  });

  it('includes a warning level when the limit is exceeded', async () => {
    User.findById.mockResolvedValue(makeUser({ dataUsageSettings: { dataLimitEnabled: true, dataLimitMB: 1, warnAtPercentage: 50 } }));
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    Message.find.mockResolvedValue([makeMessage({ mediaUrl: 'https://x/i.jpg', messageType: 'image' })]);
    const res = makeRes();
    await dataUsage.getDataUsageStats(makeReq(), res);
    expect(res.body.stats.dataLimit).toBe(1);
    expect(res.body.stats.warningLevel).toBe('warning');
    expect(res.body.stats.percentageUsed).toBeDefined();
  });

  it('returns usage by conversation sorted descending (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([
      { _id: 'conv-1', name: 'Active', isGroup: false },
      { _id: 'conv-2', name: 'Quiet', isGroup: false }
    ]);
    Message.find.mockImplementation((query) => {
      if (String(query.conversationId) === 'conv-1') {
        return Promise.resolve([makeMessage({ mediaUrl: 'https://x/i.jpg', messageType: 'image' })]);
      }
      return Promise.resolve([makeMessage({})]);
    });
    const res = makeRes();
    await dataUsage.getDataUsageByConversation(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.usageByConversation).toHaveLength(2);
    expect(res.body.usageByConversation[0].conversationId).toBe('conv-1'); // higher usage first
    expect(res.body.usageByConversation[0].estimatedUsage).toBeGreaterThan(res.body.usageByConversation[1].estimatedUsage);
  });
});
