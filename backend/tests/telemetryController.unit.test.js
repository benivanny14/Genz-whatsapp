jest.mock('../models/CrashReport', () => ({
  create: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../models/AppEvent', () => ({
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn()
}));

const CrashReport = require('../models/CrashReport');
const AppEvent = require('../models/AppEvent');
const { reportFrontendCrash, trackUpdateEvent, getUpdateUptake } = require('../controllers/telemetryController');
const { getFrontendCrashes, getAppEventSummary, getNightlyStatus } = require('../controllers/adminController');

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

describe('trackUpdateEvent (anonymous update analytics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AppEvent.create.mockResolvedValue({});
  });

  it('stores an allowlisted event with clamped fields', async () => {
    const res = makeRes();
    await trackUpdateEvent(
      { body: { event: 'update_tapped', version: '1.1.4', versionCode: 6, platform: 'apk', anonId: 'anon-1' } },
      res
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true });
    expect(AppEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'update_tapped',
        version: '1.1.4',
        versionCode: 6,
        platform: 'apk',
        anonId: 'anon-1'
      })
    );
  });

  it('rejects unknown events (allowlist)', async () => {
    const res = makeRes();
    await trackUpdateEvent({ body: { event: 'update_deleted_all' } }, res);
    expect(res.statusCode).toBe(400);
    expect(AppEvent.create).not.toHaveBeenCalled();
  });

  it('clamps long values and defaults malformed fields', async () => {
    const res = makeRes();
    await trackUpdateEvent(
      { body: { event: 'update_shown', version: 'v'.repeat(100), versionCode: -5, platform: 'nonsense', anonId: 'x'.repeat(200) } },
      res
    );
    const arg = AppEvent.create.mock.calls[0][0];
    expect(arg.version.length).toBeLessThanOrEqual(20);
    expect(arg.versionCode).toBe(0);
    expect(arg.platform).toBe('unknown');
    expect(arg.anonId.length).toBeLessThanOrEqual(64);
  });

  it('handles a missing body and storage failures gracefully', async () => {
    const missing = makeRes();
    await trackUpdateEvent({ body: undefined }, missing);
    expect(missing.statusCode).toBe(400);

    AppEvent.create.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await trackUpdateEvent({ body: { event: 'update_shown' } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('getUpdateUptake (public per-version counts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AppEvent.countDocuments.mockResolvedValue(3);
  });

  it('returns shown/updated/dismissed counts for a version over the window', async () => {
    AppEvent.countDocuments
      .mockResolvedValueOnce(10) // shown
      .mockResolvedValueOnce(2)  // updated
      .mockResolvedValueOnce(4); // dismissed
    const res = makeRes();
    await getUpdateUptake({ query: { version: '1.1.5', sinceHours: '48' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, version: '1.1.5', sinceHours: 48, shown: 10, updated: 2, dismissed: 4 });
  });

  it('requires a version and clamps sinceHours', async () => {
    const missing = makeRes();
    await getUpdateUptake({ query: {} }, missing);
    expect(missing.statusCode).toBe(400);
    expect(AppEvent.countDocuments).not.toHaveBeenCalled();

    const res = makeRes();
    await getUpdateUptake({ query: { version: '1.1.5', sinceHours: '9999' } }, res);
    expect(res.body.sinceHours).toBe(168);
  });

  it('returns 500 when the query fails', async () => {
    AppEvent.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await getUpdateUptake({ query: { version: '1.1.5' } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('getNightlyStatus (admin)', () => {
  const origFetch = global.fetch;
  afterEach(() => {
    global.fetch = origFetch;
  });

  it('maps GitHub workflow runs into a compact shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        workflow_runs: [
          { id: 1, created_at: '2026-08-13T05:02:35Z', status: 'completed', conclusion: 'success' },
          { id: 2, created_at: '2026-08-12T12:19:44Z', status: 'completed', conclusion: 'failure' },
          { id: 3, created_at: '2026-08-12T11:39:47Z', status: 'in_progress', conclusion: null }
        ]
      })
    });
    const res = makeRes();
    await getNightlyStatus({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.runs).toHaveLength(3);
    expect(res.body.runs[0]).toEqual({
      id: 1,
      createdAt: '2026-08-13T05:02:35Z',
      status: 'completed',
      conclusion: 'success'
    });
    expect(res.body.runs[2].conclusion).toBeNull();
  });

  it('returns 502 when the GitHub API is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const res = makeRes();
    await getNightlyStatus({}, res);
    expect(res.statusCode).toBe(502);
    expect(res.body.success).toBe(false);
  });
});

describe('getAppEventSummary (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AppEvent.aggregate.mockResolvedValue([
      { _id: 'update_shown', count: 3 },
      { _id: 'update_dismissed', count: 1 }
    ]);
  });

  it('returns per-event totals for the last 30 days', async () => {
    AppEvent.aggregate.mockResolvedValueOnce([
      { _id: 'update_shown', count: 3 },
      { _id: 'update_dismissed', count: 1 }
    ]).mockResolvedValueOnce([
      { _id: { version: '1.1.4', versionCode: 6 }, shown: 3, dismissed: 1, updated: 2 }
    ]);
    const res = makeRes();
    await getAppEventSummary({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.days).toBe(30);
    expect(res.body.byEvent).toEqual({ update_shown: 3, update_dismissed: 1 });
    expect(res.body.byVersion[0]).toMatchObject({ version: '1.1.4', versionCode: 6, shown: 3, updated: 2 });
  });

  it('returns 500 when aggregation fails', async () => {
    AppEvent.aggregate.mockRejectedValue(new Error('agg down'));
    const res = makeRes();
    await getAppEventSummary({}, res);
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
