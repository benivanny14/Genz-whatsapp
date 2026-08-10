/**
 * Unit tests for the view-once reveal rate limiter.
 *
 * The reveal endpoint is the ONLY way to fetch a view-once message's real
 * content, so it must have its own per-user budget — a scraper must not be
 * able to drain every view-once message in a conversation. This guards the
 * 20-per-15-minutes production config (tests run with a huge budget).
 */
describe('viewOnceRevealLimiter', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  const makeReq = (userId) => ({
    ip: '203.0.113.7',
    user: { _id: userId },
    body: {},
    headers: {}
  });

  const call = (limiter, userId) =>
    new Promise((resolve) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        send() { resolve(res); },
        json() { resolve(res); },
        setHeader() {}
      };
      limiter(makeReq(userId), res, () => resolve(res));
    });

  it('is configured with a 20-per-15-min budget keyed by the authenticated user', () => {
    const rateLimit = jest.fn((opts) => opts);
    jest.doMock('express-rate-limit', () => rateLimit);
    let limiter;
    jest.isolateModules(() => {
      limiter = require('../middleware/rateLimiters').viewOnceRevealLimiter;
    });
    jest.dontMock('express-rate-limit');

    expect(limiter.windowMs).toBe(15 * 60 * 1000);
    expect(limiter.max).toBe(20);
    expect(typeof limiter.keyGenerator).toBe('function');
    // Per-user key, not the shared NAT/campus IP.
    expect(limiter.keyGenerator({ user: { _id: 'u-1' }, ip: '9.9.9.9' })).toBe('user:u-1');
  });

  it('allows reveals within the 20/15min budget and returns 429 once exhausted', async () => {
    const { viewOnceRevealLimiter } = require('../middleware/rateLimiters');
    for (let i = 0; i < 20; i++) {
      const res = await call(viewOnceRevealLimiter, 'rl-user-1');
      expect(res.statusCode).toBe(200);
    }
    const exceeded = await call(viewOnceRevealLimiter, 'rl-user-1');
    expect(exceeded.statusCode).toBe(429);
  });

  it('keeps separate budgets per user', async () => {
    const { viewOnceRevealLimiter } = require('../middleware/rateLimiters');
    for (let i = 0; i < 20; i++) {
      expect((await call(viewOnceRevealLimiter, 'rl-user-2')).statusCode).toBe(200);
    }
    // User-2 exhausts their own budget...
    expect((await call(viewOnceRevealLimiter, 'rl-user-2')).statusCode).toBe(429);
    // ...but a different user is unaffected.
    expect((await call(viewOnceRevealLimiter, 'rl-user-3')).statusCode).toBe(200);
  });
});
