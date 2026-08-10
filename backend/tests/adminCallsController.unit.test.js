jest.mock('../models/CallLog', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const CallLog = require('../models/CallLog');
const { logAdminAction } = require('../utils/auditLogger');
const adminCalls = require('../controllers/adminCallsController');

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

describe('adminCallsController — listCalls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists calls with pagination and filters (happy path)', async () => {
    CallLog.countDocuments.mockResolvedValue(25);
    const calls = [{ _id: 'c1' }];
    const chain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(calls) }) })
          })
        })
      })
    };
    CallLog.find.mockReturnValue(chain);
    const res = makeRes();
    await adminCalls.listCalls(makeReq({ query: { callType: 'video', status: 'completed', page: '2', limit: '10' } }), res);
    expect(CallLog.find).toHaveBeenCalledWith({ callType: 'video', status: 'completed' });
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 25, pages: 3 });
    expect(res.body.calls).toHaveLength(1);
  });

  it('returns 500 when listing calls fails (error)', async () => {
    CallLog.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminCalls.listCalls(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminCallsController — getCallStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes stats from aggregates (happy path)', async () => {
    CallLog.countDocuments.mockResolvedValue(100);
    CallLog.aggregate
      .mockResolvedValueOnce([{ _id: 'video', count: 60 }, { _id: 'audio', count: 40 }])
      .mockResolvedValueOnce([{ _id: 'completed', count: 80 }, { _id: 'missed', count: 20 }])
      .mockResolvedValueOnce([{ _id: null, avg: 120.4 }]);

    const res = makeRes();
    await adminCalls.getCallStats(makeReq(), res);
    expect(res.body.stats.totalCalls).toBe(100);
    expect(res.body.stats.byType).toEqual({ video: 60, audio: 40 });
    expect(res.body.stats.byStatus).toEqual({ completed: 80, missed: 20 });
    expect(res.body.stats.avgDurationSeconds).toBe(120);
  });

  it('handles a missing avg aggregation (happy path)', async () => {
    CallLog.countDocuments.mockResolvedValue(0);
    CallLog.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const res = makeRes();
    await adminCalls.getCallStats(makeReq(), res);
    expect(res.body.stats.avgDurationSeconds).toBe(0);
  });

  it('returns 500 when computing stats fails (error)', async () => {
    CallLog.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminCalls.getCallStats(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminCallsController — deleteCallLog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a call log and logs the action (happy path)', async () => {
    const call = { _id: 'c1', deleteOne: jest.fn().mockResolvedValue({}) };
    CallLog.findById.mockResolvedValue(call);
    const res = makeRes();
    await adminCalls.deleteCallLog(makeReq({ params: { id: 'c1' } }), res);
    expect(call.deleteOne).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'admin_deleted_call_log', expect.anything(), null, null, expect.anything());
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the call log is not found (auth)', async () => {
    CallLog.findById.mockResolvedValue(null);
    const res = makeRes();
    await adminCalls.deleteCallLog(makeReq({ params: { id: 'missing' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 500 when deletion fails (error)', async () => {
    CallLog.findById.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminCalls.deleteCallLog(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(500);
  });
});
