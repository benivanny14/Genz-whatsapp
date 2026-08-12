const { safeFilename } = require('../utils/safeFilename');
const { validateOrigin } = require('../middleware/security');
const { INTERVAL_MS, isDue } = require('../utils/backupScheduler');
const presenceStore = require('../utils/presenceStore');

describe('safeFilename (P1 path traversal defense)', () => {
  test('returns fallback for empty/missing names', () => {
    expect(safeFilename('', 'img')).toBe('img');
    expect(safeFilename(undefined, 'img')).toBe('img');
    expect(safeFilename('   ', 'img')).toBe('img');
  });

  test('strips path traversal segments', () => {
    expect(safeFilename('../../etc/passwd', 'img')).toBe('passwd');
    expect(safeFilename('..\\..\\windows\\system32\\cmd.exe', 'img')).toBe('cmd.exe');
    expect(safeFilename('/etc/shadow', 'img')).toBe('shadow');
    expect(safeFilename('....//evil', 'img')).toBe('evil');
  });

  test('removes control characters and unsafe symbols', () => {
    expect(safeFilename('a\u0000b.txt')).toBe('ab.txt');
    expect(safeFilename('file; rm -rf /')).toBe('file');
    expect(safeFilename('my:file?.txt')).toBe('my_file_.txt');
  });

  test('rejects dotfiles and ".."', () => {
    expect(safeFilename('.env', 'img')).toBe('env');
    expect(safeFilename('..', 'img')).toBe('img');
    expect(safeFilename('...', 'img')).toBe('img');
  });

  test('preserves safe filenames and caps length', () => {
    expect(safeFilename('profile-photo-2026.png')).toBe('profile-photo-2026.png');
    const long = 'a'.repeat(250) + '.txt';
    expect(safeFilename(long).length).toBeLessThanOrEqual(100);
  });
});

describe('validateOrigin (P1 CSRF origin guard)', () => {
  const mw = validateOrigin(['https://genz.example.com', 'https://api.example.com']);
  const makeReq = (method, origin) => ({ method, headers: { origin } });
  const makeRes = () => {
    const res = { statusCode: 200 };
    res.status = (code) => {
      res.statusCode = code;
      return { json: () => {} };
    };
    return res;
  };

  test('passes GET/HEAD/OPTIONS regardless of origin', () => {
    expect(mw(makeReq('GET', 'https://evil.example.com'), makeRes(), () => {})).toBeUndefined();
    expect(mw(makeReq('HEAD', 'https://evil.example.com'), makeRes(), () => {})).toBeUndefined();
    expect(mw(makeReq('OPTIONS', 'https://evil.example.com'), makeRes(), () => {})).toBeUndefined();
  });

  test('passes state-changing requests without an Origin header', () => {
    expect(mw(makeReq('POST', undefined), makeRes(), () => {})).toBeUndefined();
  });

  test('passes allowed origins', () => {
    expect(mw(makeReq('POST', 'https://genz.example.com'), makeRes(), () => {})).toBeUndefined();
    expect(mw(makeReq('DELETE', 'https://api.example.com'), makeRes(), () => {})).toBeUndefined();
    expect(mw(makeReq('PUT', 'http://localhost:5173'), makeRes(), () => {})).toBeUndefined();
    expect(mw(makeReq('POST', 'http://127.0.0.1:5000'), makeRes(), () => {})).toBeUndefined();
  });

  test('blocks cross-origin state-changing requests with 403', () => {
    const res = makeRes();
    const next = jest.fn();
    mw(makeReq('POST', 'https://evil.example.com'), res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('backupScheduler isDue (P4)', () => {
  test('disabled settings never run', () => {
    expect(isDue({ enabled: false, interval: 'daily', lastBackupAt: new Date(0).toISOString() })).toBe(false);
  });

  test('missing lastBackupAt runs immediately', () => {
    expect(isDue({ enabled: true, interval: 'hourly' })).toBe(true);
  });

  test('respects interval windows', () => {
    const settings = { enabled: true, interval: 'daily' };
    const now = Date.now();
    expect(isDue({ ...settings, lastBackupAt: new Date(now - INTERVAL_MS.daily + 1000).toISOString() })).toBe(false);
    expect(isDue({ ...settings, lastBackupAt: new Date(now - INTERVAL_MS.daily - 1000).toISOString() })).toBe(true);
  });

  test('unknown interval falls back to daily', () => {
    expect(INTERVAL_MS.weekly).toBe(7 * 24 * 60 * 60 * 1000);
    expect(INTERVAL_MS.monthly).toBe(30 * 24 * 60 * 60 * 1000);
    expect(isDue({ enabled: true, interval: 'fortnightly', lastBackupAt: new Date(Date.now() - INTERVAL_MS.daily * 2).toISOString() })).toBe(true);
  });
});

describe('strictRateLimiter (admin sensitive ops)', () => {
  const originalMax = process.env.ADMIN_STRICT_MAX;

  beforeEach(() => {
    delete process.env.ADMIN_STRICT_MAX;
    jest.resetModules();
  });

  afterAll(() => {
    if (originalMax === undefined) delete process.env.ADMIN_STRICT_MAX;
    else process.env.ADMIN_STRICT_MAX = originalMax;
  });

  const makeReq = (overrides = {}) => ({
    ip: '203.0.113.50',
    admin: { id: 'admin-1', username: 'root' },
    headers: {},
    body: {},
    ...overrides
  });

  const call = (req) =>
    new Promise((resolve) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        send() { resolve(res); },
        json() { resolve(res); },
        setHeader() {}
      };
      const { strictRateLimiter } = require('../middleware/security');
      strictRateLimiter(req, res, () => resolve(res));
    });

  it('is configured per admin account (10/hour) falling back to IP', () => {
    const ipKeyGenerator = (req) => `ip:${req.ip}`;
    const rateLimit = jest.fn((opts) => opts);
    rateLimit.ipKeyGenerator = ipKeyGenerator;
    jest.doMock('express-rate-limit', () => rateLimit);
    let limiter;
    jest.isolateModules(() => {
      limiter = require('../middleware/security').strictRateLimiter;
    });
    jest.dontMock('express-rate-limit');

    expect(limiter.windowMs).toBe(60 * 60 * 1000);
    expect(limiter.max).toBe(10);
    expect(typeof limiter.keyGenerator).toBe('function');
    // Authenticated admin -> per-account key regardless of IP.
    expect(limiter.keyGenerator(makeReq({ ip: '9.9.9.9' }))).toBe('admin:admin-1');
    expect(limiter.keyGenerator(makeReq({ ip: '10.0.0.1' }))).toBe('admin:admin-1');
    // Unauthenticated (bootstrap) -> IP key.
    expect(limiter.keyGenerator(makeReq({ admin: undefined }))).toBe('ip:203.0.113.50');
  });

  it('allows 10 sensitive ops per hour then returns 429', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await call(makeReq())).statusCode).toBe(200);
    }
    expect((await call(makeReq())).statusCode).toBe(429);
  });

  it('keeps separate budgets per admin account', async () => {
    // Exhaust admin-1's budget...
    for (let i = 0; i < 10; i++) {
      expect((await call(makeReq())).statusCode).toBe(200);
    }
    expect((await call(makeReq())).statusCode).toBe(429);
    // ...while admin-2 (same IP) is unaffected.
    const res = await call(makeReq({ admin: { id: 'admin-2', username: 'root2' } }));
    expect(res.statusCode).toBe(200);
  });

  it('respects the ADMIN_STRICT_MAX override for CI runs', () => {
    process.env.ADMIN_STRICT_MAX = '100';
    const rateLimit = jest.fn((opts) => opts);
    jest.doMock('express-rate-limit', () => rateLimit);
    let limiter;
    jest.isolateModules(() => {
      limiter = require('../middleware/security').strictRateLimiter;
    });
    jest.dontMock('express-rate-limit');
    expect(limiter.max).toBe(100);
  });
});

describe('presenceStore (P2 Redis presence)', () => {
  afterEach(() => {
    const known = ['u1', 'u2', 'gone'];
    known.forEach((u) => presenceStore.removeLocalPresence(u));
  });

  test('tracks local presence', () => {
    presenceStore.setLocalPresence('u1', { online: true });
    expect(presenceStore.isOnline('u1')).toBe(true);
    expect(presenceStore.isAway('u1')).toBe(false);
    presenceStore.setLocalPresence('u1', { online: true, away: true });
    expect(presenceStore.isAway('u1')).toBe(true);
  });

  test('removes presence on disconnect', () => {
    presenceStore.setLocalPresence('gone', { online: true });
    expect(presenceStore.isOnline('gone')).toBe(true);
    presenceStore.removeLocalPresence('gone');
    expect(presenceStore.isOnline('gone')).toBe(false);
  });

  test('single-instance mode (no Redis) never crashes', () => {
    expect(() => presenceStore.setLocalPresence('u2', { online: true })).not.toThrow();
    expect(() => presenceStore.publish({ userId: 'u2', online: true })).not.toThrow();
    expect(presenceStore.EVENT_CHANNEL).toBe('genz:presence');
  });
});
