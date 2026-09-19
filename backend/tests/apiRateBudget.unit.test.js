// Guards the global /api rate-limit budget.
//
// Why this exists: the CI e2e job runs 29 Playwright specs, three socket
// scripts, the smoke test (137 checks) and the full verification (186 checks)
// against ONE runner IP inside a single 15-minute window. The global limiter's
// development budget (200) was exhausted partway through, so 231 requests came
// back 429 — and because the limiter is mounted at /api/ it also swallowed the
// admin login path, which made every later step fail for a reason unrelated to
// what it was testing. The budget is now overridable with API_RATE_MAX (the
// same escape hatch AUTH_RATE_MAX gives the auth budget), and this file pins
// down both halves of that contract: the production default must not drift,
// and the e2e job must actually raise the budget.
process.env.API_RATE_MAX = '4'; // read once, at server.js module load

// The mock must be registered before the require chain reaches
// whatsappOtpService, exactly like tests/whatsappWebhook.unit.test.js.
jest.mock('whatsapp-web.js', () => {
  const noop = jest.fn();
  return {
    Client: jest.fn().mockImplementation(() => ({
      on: noop,
      initialize: noop,
      destroy: noop,
      sendMessage: noop
    })),
    LocalAuth: jest.fn()
  };
});

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app } = require('../server');
const {
  resolveApiRateMax,
  PRODUCTION_DEFAULT,
  TEST_DEFAULT,
  DEVELOPMENT_DEFAULT
} = require('../utils/apiRateBudget');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// A path that the limiter's `skip` list does not exempt (it skips /auth/me,
// /health, /status and /updates/check) and that no route owns, so the request
// exercises the limiter and nothing else.
const PROBE_PATH = '/api/__rate_limit_probe__';

describe('global /api rate-limit budget', () => {
  it('defaults to 5000 per 15 min in production, 100000 in tests, 200 in development', () => {
    expect(resolveApiRateMax({ NODE_ENV: 'production' })).toBe(PRODUCTION_DEFAULT);
    expect(PRODUCTION_DEFAULT).toBe(5000);
    expect(resolveApiRateMax({ NODE_ENV: 'test' })).toBe(TEST_DEFAULT);
    expect(resolveApiRateMax({ NODE_ENV: 'development' })).toBe(DEVELOPMENT_DEFAULT);
    // No NODE_ENV at all is treated as development, never as production.
    expect(resolveApiRateMax({})).toBe(DEVELOPMENT_DEFAULT);
  });

  it('lets an operator raise the budget and ignores unusable overrides', () => {
    expect(resolveApiRateMax({ NODE_ENV: 'production', API_RATE_MAX: '100000' })).toBe(100000);
    expect(resolveApiRateMax({ NODE_ENV: 'development', API_RATE_MAX: '2500' })).toBe(2500);
    // A typo must fall back to the real default instead of disabling the
    // limiter (max: 0 / NaN would otherwise reject or allow everything).
    for (const bad of ['', 'not-a-number', '0', '-5', undefined]) {
      expect(resolveApiRateMax({ NODE_ENV: 'production', API_RATE_MAX: bad })).toBe(PRODUCTION_DEFAULT);
    }
  });

  it('applies the override to the live /api limiter, then 429s past the budget', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app).get(PROBE_PATH);
      expect(res.statusCode).not.toBe(429);
    }

    const blocked = await request(app).get(PROBE_PATH);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.error).toMatch(/Too many requests from this IP/);
  });

  it('keeps server.js wired to the shared resolver (no re-inlined default)', () => {
    const serverSrc = fs.readFileSync(path.join(REPO_ROOT, 'backend', 'server.js'), 'utf8');
    expect(serverSrc).toMatch(/require\("\.\/utils\/apiRateBudget"\)|require\('\.\/utils\/apiRateBudget'\)/);
    expect(serverSrc).toMatch(/max:\s*resolveApiRateMax\(\)/);
  });
});

describe('CI e2e job', () => {
  const ciYml = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');

  const jobBlock = (name) => {
    const lines = ciYml.split(/\r?\n/);
    const start = lines.findIndex((line) => line === `  ${name}:`);
    if (start === -1) return null;
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => /^ {2}[A-Za-z0-9_-]+:/.test(line));
    return (end === -1 ? rest : rest.slice(0, end)).join('\n');
  };

  it('raises API_RATE_MAX above the development default', () => {
    const e2e = jobBlock('e2e');
    expect(e2e).toBeTruthy();

    const match = e2e.match(/API_RATE_MAX:\s*['"]?(\d+)['"]?/);
    expect(match).toBeTruthy();

    const budget = Number(match[1]);
    // The whole job — Playwright, the socket scripts, the 137-check smoke test
    // and the 186-check verification — shares this one budget from one IP. If
    // it ever drops back to the 200 development default, every step after the
    // first few specs fails with 429 again.
    expect(budget).toBeGreaterThan(DEVELOPMENT_DEFAULT);
    expect(budget).toBeGreaterThanOrEqual(10000);
  });
});
