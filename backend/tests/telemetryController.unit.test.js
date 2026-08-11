jest.mock('../models/CrashReport', () => ({
  create: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn()
}));

const CrashReport = require('../models/CrashReport');
const { reportFrontendCrash } = require('../controllers/telemetryController');
const { getFrontendCrashes } = require('../controllers/adminController');

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

describe('reportFrontendCrash (telemetry)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CrashReport.create.mockResolvedValue({});
  });

  it('stores a crash report with the authenticated user attached', async () => {
    const res = makeRes();
    await reportFrontendCrash(
      { body: { route: '/genz-mods', message: 'k.map is not a function' }, user: { _id: 'user-42' } },
      res
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true });
    expect(CrashReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/genz-mods',
        message: 'k.map is not a function',
        userId: 'user-42'
      })
    );
  });

  it('clamps long routes/messages and defaults missing fields', async () => {
    const res = makeRes();
    await reportFrontendCrash(
      { body: { route: 'x'.repeat(2000), message: 'y'.repeat(5000) }, user: { _id: 'user-1' } },
      res
    );
    const arg = CrashReport.create.mock.calls[0][0];
    expect(arg.route.length).toBeLessThanOrEqual(500);
    expect(arg.message.length).toBeLessThanOrEqual(2000);
  });

  it('defaults route to "/" when the body is empty or malformed', async () => {
    const res = makeRes();
    await reportFrontendCrash({ body: undefined, user: { _id: 'user-1' } }, res);
    expect(CrashReport.create).toHaveBeenCalledWith(expect.objectContaining({ route: '/' }));
  });

  it('returns 500 when storage fails', async () => {
    CrashReport.create.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await reportFrontendCrash({ body: {}, user: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('getFrontendCrashes (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CrashReport.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ route: '/a', message: 'm' }]) })
      })
    });
    CrashReport.aggregate.mockResolvedValue([
      { _id: { route: '/a', message: 'm' }, count: 3, lastSeen: new Date('2026-01-01') }
    ]);
  });

  it('returns recent reports and a grouped summary', async () => {
    const res = makeRes();
    await getFrontendCrashes({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.crashes.recent).toHaveLength(1);
    expect(res.body.crashes.grouped[0]).toEqual({
      route: '/a',
      message: 'm',
      count: 3,
      lastSeen: expect.any(Date)
    });
  });

  it('returns 500 on aggregate failure', async () => {
    CrashReport.aggregate.mockRejectedValue(new Error('agg down'));
    const res = makeRes();
    await getFrontendCrashes({}, res);
    expect(res.statusCode).toBe(500);
  });
});
