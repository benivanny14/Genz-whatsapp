/**
 * Integration test: the strict admin rate limiter on REAL /api/admin routes.
 *
 * End-to-end proof that the per-account keying works over HTTP:
 *   1. two admin owners provisioned (2FA on) directly in the test DB
 *   2. full login flow via HTTP (loginStep1 -> verify-2fa -> accessToken)
 *   3. 10 sensitive ops succeed, the 11th returns 429 (10/hour budget)
 *   4. a second admin behind the SAME IP keeps its own budget (no shared burn)
 *
 * Runs against the real server app (supertest) + MongoMemoryServer, so it
 * exercises superAdminAuth -> strictRateLimiter -> controller exactly like
 * production does.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const { app } = require('../server');
const AdminOwner = require('../models/AdminOwner');
const { strictRateLimiter } = require('../middleware/security');

jest.setTimeout(60000);

const ADMIN_AUTH = '/api/system-gateway-x9k/auth'; // obscured login path (test default)
const ADMIN_API = '/api/admin'; // admin API surface (API_ROUTE_MOUNTS)
const ADMIN_PASSWORD = 'Admin@Integration2026!';
const FAKE_DEVICE_ID = '000000000000000000000000'; // valid ObjectId, no device

const makeOwner = async (username) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  const owner = new AdminOwner({
    ownerKey: `TEST_RL_${username.toUpperCase()}`,
    username,
    totpSecret: secret.base32,
    totpEnabled: true
  });
  await owner.setPassword(ADMIN_PASSWORD);
  await owner.save();
  return { owner, secret: secret.base32 };
};

const login = async (username, base32Secret) => {
  const step1 = await request(app)
    .post(`${ADMIN_AUTH}/login`)
    .send({ username, password: ADMIN_PASSWORD });
  expect(step1.statusCode).toBe(200);
  expect(step1.body.requiresTwoFactor).toBe(true);
  const { preAuthToken } = step1.body;
  expect(preAuthToken).toBeTruthy();

  const step2 = await request(app)
    .post(`${ADMIN_AUTH}/verify-2fa`)
    .send({
      preAuthToken,
      code: speakeasy.totp({ secret: base32Secret, encoding: 'base32' })
    });
  expect(step2.statusCode).toBe(200);
  expect(step2.body.accessToken).toBeTruthy();
  return step2.body.accessToken;
};

const sensitiveOp = (token) =>
  request(app)
    .delete(`${ADMIN_API}/devices/${FAKE_DEVICE_ID}`)
    .set('Authorization', `Bearer ${token}`);

describe('strict admin rate limiter (integration, real routes)', () => {
  let admin1, admin2;

  beforeEach(async () => {
    // setup.js wipes every collection after each test, so (re)provision fresh
    // owners here — never in beforeAll.
    admin1 = await makeOwner('rl_admin_1');
    admin2 = await makeOwner('rl_admin_2');

    // Fresh budget for the admin account under test — the limiter store is
    // in-memory and shared across the jest process, so pin it to a clean slate
    // (same pattern the unit tests use via module re-require).
    strictRateLimiter.resetKey(`admin:${admin1.owner._id}`);
    strictRateLimiter.resetKey(`admin:${admin2.owner._id}`);
  });

  afterAll(async () => {
    await AdminOwner.deleteMany({ ownerKey: /^TEST_RL_/ }).catch(() => {});
  });

  it('allows 10 sensitive ops per admin then returns 429 on the 11th', async () => {
    const token = await login('rl_admin_1', admin1.secret);

    for (let i = 0; i < 10; i++) {
      const res = await sensitiveOp(token);
      // Device doesn't exist -> 404, but crucially NOT 429.
      expect(res.statusCode).not.toBe(429);
    }

    const blocked = await sensitiveOp(token);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.error).toMatch(/Too many requests/i);
  });

  it('keeps separate budgets per admin account even from the same IP', async () => {
    const token1 = await login('rl_admin_1', admin1.secret);
    const token2 = await login('rl_admin_2', admin2.secret);

    // Exhaust admin-1's budget...
    for (let i = 0; i < 10; i++) {
      await sensitiveOp(token1);
    }
    expect((await sensitiveOp(token1)).statusCode).toBe(429);

    // ...while admin-2 (same IP: supertest connects from 127.0.0.1) is fine.
    const res2 = await sensitiveOp(token2);
    expect(res2.statusCode).not.toBe(429);
  });

  it('unauthenticated sensitive op is rejected by auth before the limiter', async () => {
    const res = await request(app).delete(`${ADMIN_API}/devices/${FAKE_DEVICE_ID}`);
    expect(res.statusCode).toBe(401);
  });
});
