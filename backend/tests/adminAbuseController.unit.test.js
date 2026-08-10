jest.mock('../models/AbuseReport', () => {
  const MockAbuseReport = jest.fn();
  MockAbuseReport.countDocuments = jest.fn();
  MockAbuseReport.find = jest.fn();
  MockAbuseReport.findById = jest.fn();
  MockAbuseReport.findByIdAndUpdate = jest.fn();
  MockAbuseReport.aggregate = jest.fn();
  return MockAbuseReport;
});

jest.mock('../models/User', () => ({}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const AbuseReport = require('../models/AbuseReport');
const {
  listAbuseReports,
  getAbuseReport,
  updateAbuseReportStatus,
  deleteAbuseReport,
  getAbuseReportStats
} = require('../controllers/adminAbuseController');

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
  query: {},
  params: {},
  body: {},
  admin: { id: 'admin-1' },
  ...overrides
});

describe('adminAbuseController — listAbuseReports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists reports with pagination and filters (happy path)', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'r1', category: 'spam' }])
    };
    AbuseReport.countDocuments.mockResolvedValue(42);
    AbuseReport.find.mockReturnValue(chain);

    const res = makeRes();
    await listAbuseReports(makeReq({ query: { status: 'pending', page: '2', limit: '10' } }), res);

    expect(AbuseReport.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(res.body.success).toBe(true);
    expect(res.body.reports).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 42, pages: 5 });
  });

  it('clamps invalid page/limit values to safe defaults', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    };
    AbuseReport.countDocuments.mockResolvedValue(0);
    AbuseReport.find.mockReturnValue(chain);

    const res = makeRes();
    await listAbuseReports(makeReq({ query: { page: 'abc', limit: '9999' } }), res);

    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(100); // clamped to the max
  });
});

describe('adminAbuseController — getAbuseReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for a missing report', async () => {
    const chain = { populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) };
    AbuseReport.findById.mockReturnValue(chain);
    const res = makeRes();
    await getAbuseReport(makeReq({ params: { id: 'r1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns the report (happy path)', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'r1', category: 'harassment' })
    };
    AbuseReport.findById.mockReturnValue(chain);
    const res = makeRes();
    await getAbuseReport(makeReq({ params: { id: 'r1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.report._id).toBe('r1');
  });
});

describe('adminAbuseController — updateAbuseReportStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid status with 400 (validation)', async () => {
    const res = makeRes();
    await updateAbuseReportStatus(makeReq({ params: { id: 'r1' }, body: { status: 'nonsense' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid status');
  });

  it('rejects an invalid actionTaken with 400 (validation)', async () => {
    const res = makeRes();
    await updateAbuseReportStatus(
      makeReq({ params: { id: 'r1' }, body: { status: 'resolved', actionTaken: 'hack' } }),
      res
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the report does not exist', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve(null))
    };
    AbuseReport.findByIdAndUpdate.mockReturnValue(chain);
    const res = makeRes();
    await updateAbuseReportStatus(makeReq({ params: { id: 'r1' }, body: { status: 'resolved' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates status and records the resolution (happy path)', async () => {
    const report = { _id: 'r1', reportedUserId: 'u1', status: 'resolved' };
    const chain = {
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve(report))
    };
    AbuseReport.findByIdAndUpdate.mockReturnValue(chain);
    const res = makeRes();
    await updateAbuseReportStatus(
      makeReq({ params: { id: 'r1' }, body: { status: 'resolved', adminNotes: 'warned user' } }),
      res
    );
    expect(AbuseReport.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ status: 'resolved', resolvedBy: 'admin-1' }),
      { new: true }
    );
    expect(res.body.success).toBe(true);
  });
});

describe('adminAbuseController — deleteAbuseReport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for a missing report', async () => {
    AbuseReport.findById.mockResolvedValue(null);
    const res = makeRes();
    await deleteAbuseReport(makeReq({ params: { id: 'r1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes the report (happy path)', async () => {
    const report = { _id: 'r1', reportedUserId: 'u1', deleteOne: jest.fn().mockResolvedValue(undefined) };
    AbuseReport.findById.mockResolvedValue(report);
    const res = makeRes();
    await deleteAbuseReport(makeReq({ params: { id: 'r1' } }), res);
    expect(report.deleteOne).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });
});

describe('adminAbuseController — getAbuseReportStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('aggregates stats and recent reports (happy path)', async () => {
    AbuseReport.countDocuments.mockResolvedValue(5);
    AbuseReport.aggregate
      .mockResolvedValueOnce([{ _id: 'spam', count: 3 }])
      .mockResolvedValueOnce([{ _id: 'high', count: 2 }])
      .mockResolvedValueOnce([{ _id: 'message', count: 4 }]);
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'r1' }])
    };
    AbuseReport.find.mockReturnValue(chain);

    const res = makeRes();
    await getAbuseReportStats(makeReq(), res);

    expect(res.body.success).toBe(true);
    expect(res.body.stats.total).toBe(5);
    expect(res.body.stats.byCategory).toEqual({ spam: 3 });
    expect(res.body.stats.byPriority).toEqual({ high: 2 });
    expect(res.body.recentReports).toHaveLength(1);
  });
});
