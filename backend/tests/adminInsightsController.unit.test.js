jest.mock('../models/User', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Message', () => ({
  aggregate: jest.fn()
}));

jest.mock('../models/ManualPayment', () => ({
  aggregate: jest.fn()
}));

const User = require('../models/User');
const Message = require('../models/Message');
const ManualPayment = require('../models/ManualPayment');
const adminInsights = require('../controllers/adminInsightsController');

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
  ...overrides
});

describe('adminInsightsController — getGrowthReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds the growth report (happy path)', async () => {
    User.aggregate.mockResolvedValue([{ _id: '2026-08-01', count: 5 }]);
    Message.aggregate.mockResolvedValue([{ _id: '2026-08-01', count: 20 }]);
    ManualPayment.aggregate.mockResolvedValue([{ _id: '2026-08-01', total: 30000 }]);

    const res = makeRes();
    await adminInsights.getGrowthReport(makeReq(), res);
    expect(User.aggregate).toHaveBeenCalled();
    expect(Message.aggregate).toHaveBeenCalled();
    expect(ManualPayment.aggregate).toHaveBeenCalled();
    expect(res.body.report.userGrowth).toHaveLength(1);
    expect(res.body.report.messageGrowth).toHaveLength(1);
    expect(res.body.report.revenueGrowth).toHaveLength(1);
  });

  it('returns 500 when the report fails (error)', async () => {
    User.aggregate.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminInsights.getGrowthReport(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminInsightsController — getEngagementReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds the engagement report (happy path)', async () => {
    User.countDocuments.mockResolvedValue(42);
    Message.aggregate.mockResolvedValue([{ count: 10, user: { username: 'alice' } }]);

    const res = makeRes();
    await adminInsights.getEngagementReport(makeReq(), res);
    expect(User.countDocuments).toHaveBeenCalledWith({ lastSeen: { $gte: expect.any(Date) } });
    expect(res.body.report.dailyActiveUsers).toBe(42);
    expect(res.body.report.topSenders).toHaveLength(1);
  });

  it('returns 500 when the report fails (error)', async () => {
    User.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminInsights.getEngagementReport(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminInsightsController — getFraudSignals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes fraud signals (happy path)', async () => {
    User.aggregate
      .mockResolvedValueOnce([{ _id: '1.2.3.4', userCount: 3 }]) // shared IPs
      .mockResolvedValueOnce([{ _id: '2026-08-01 10', count: 12 }]); // signup bursts
    const bruteForceTargets = [{ username: 'bob', failedLoginAttempts: 5 }];
    const chain = {
      select: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(bruteForceTargets) }) }) })
    };
    User.find.mockReturnValue(chain);

    const res = makeRes();
    await adminInsights.getFraudSignals(makeReq(), res);
    expect(res.body.signals.sharedIps).toHaveLength(1);
    expect(res.body.signals.bruteForceTargets).toHaveLength(1);
    expect(res.body.signals.signupBursts).toHaveLength(1);
  });

  it('returns 500 when computing fraud signals fails (error)', async () => {
    User.aggregate.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminInsights.getFraudSignals(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});
