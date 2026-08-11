/**
 * Integration test: full admin authentication flow against a REAL MongoDB.
 *
 * Covers the security-critical admin gate:
 *   1. loginStep1 (username + password)        → short-lived preAuthToken, NO access token
 *   2. loginStep2 (TOTP code via speakeasy)    → accessToken + refreshToken
 *   3. refreshSession (refresh token rotation) → new access/refresh tokens
 *   4. wrong TOTP code                         → rejected + failed attempt recorded
 *
 * Safe by construction: SKIPS unless MONGO_TEST_URI is explicitly set, and the
 * caller must point it at an ISOLATED database (AdminOwner is wiped before/after).
 */
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');

const URI = process.env.MONGO_TEST_URI;

if (!URI) {
  describe.skip('admin auth flow (integration)', () => {
    it('skipped — set MONGO_TEST_URI to an isolated MongoDB to run', () => {});
  });
} else {
  const AdminOwner = require('../models/AdminOwner');
  const { loginStep1, loginStep2, refreshSession } = require('../controllers/adminAuthController');

  const ADMIN_PASSWORD = 'Admin@SuperSecret2026!';

  const makeRes = () => {
    const res = { statusCode: 200 };
    res.status = jest.fn((code) => { res.statusCode = code; return res; });
    res.json = jest.fn((body) => { res.body = body; return res; });
    return res;
  };

  const makeReq = (overrides = {}) => ({
    body: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides
  });

  const createOwner = async () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const owner = new AdminOwner({
      ownerKey: 'PRIMARY_OWNER',
      username: 'root_admin',
      totpSecret: secret.base32,
      totpEnabled: true
    });
    await owner.setPassword(ADMIN_PASSWORD);
    await owner.save();
    return { owner, secret: secret.base32 };
  };

  const currentTotp = (base32Secret) =>
    speakeasy.totp({ secret: base32Secret, encoding: 'base32' });

  describe('admin auth flow (integration)', () => {
    beforeAll(async () => {
      await mongoose.disconnect().catch(() => {});
      await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    });

    beforeEach(async () => {
      await AdminOwner.deleteMany({});
    });

    afterAll(async () => {
      await AdminOwner.deleteMany({}).catch(() => {});
      await mongoose.disconnect().catch(() => {});
    });

    it('wrong password never returns a token and records a failed attempt', async () => {
      const { owner } = await createOwner();
      const res = makeRes();
      await loginStep1(
        makeReq({ body: { username: 'root_admin', password: 'WrongPassword123!' } }),
        res
      );
      expect(res.statusCode).toBe(401);
      expect(res.body.accessToken).toBeUndefined();

      const fresh = await AdminOwner.findById(owner._id);
      expect(fresh.failedLoginAttempts).toBeGreaterThan(0);
    });

    it('step1 only returns a pre-2FA token; step2 with the correct TOTP issues real tokens', async () => {
      const { secret } = await createOwner();

      const step1Res = makeRes();
      await loginStep1(
        makeReq({ body: { username: 'root_admin', password: ADMIN_PASSWORD } }),
        step1Res
      );
      expect(step1Res.statusCode).toBe(200);
      expect(step1Res.body.requiresTwoFactor).toBe(true);
      expect(step1Res.body.preAuthToken).toBeTruthy();
      expect(step1Res.body.accessToken).toBeUndefined();

      const step2Res = makeRes();
      await loginStep2(
        makeReq({ body: { preAuthToken: step1Res.body.preAuthToken, code: currentTotp(secret) } }),
        step2Res
      );
      expect(step2Res.statusCode).toBe(200);
      expect(step2Res.body.accessToken).toBeTruthy();
      expect(step2Res.body.refreshToken).toBeTruthy();
      expect(step2Res.body.admin.username).toBe('root_admin');
    });

    it('an incorrect TOTP code is rejected and counts as a failed attempt', async () => {
      const { owner, secret } = await createOwner();

      const step1Res = makeRes();
      await loginStep1(
        makeReq({ body: { username: 'root_admin', password: ADMIN_PASSWORD } }),
        step1Res
      );

      const bad = currentTotp(secret) === '000000' ? '111111' : '000000';
      const step2Res = makeRes();
      await loginStep2(
        makeReq({ body: { preAuthToken: step1Res.body.preAuthToken, code: bad } }),
        step2Res
      );
      expect(step2Res.statusCode).toBe(401);

      const fresh = await AdminOwner.findById(owner._id);
      expect(fresh.failedLoginAttempts).toBeGreaterThan(0);
    });

    it('refresh rotates the refresh token (old one stops working)', async () => {
      const { secret } = await createOwner();

      const step1Res = makeRes();
      await loginStep1(
        makeReq({ body: { username: 'root_admin', password: ADMIN_PASSWORD } }),
        step1Res
      );
      const step2Res = makeRes();
      await loginStep2(
        makeReq({ body: { preAuthToken: step1Res.body.preAuthToken, code: currentTotp(secret) } }),
        step2Res
      );
      const firstRefresh = step2Res.body.refreshToken;

      const refresh1 = makeRes();
      await refreshSession(makeReq({ body: { refreshToken: firstRefresh } }), refresh1);
      expect(refresh1.statusCode).toBe(200);
      expect(refresh1.body.accessToken).toBeTruthy();
      const secondRefresh = refresh1.body.refreshToken;
      expect(secondRefresh).not.toBe(firstRefresh);

      // The original refresh token must be dead after rotation.
      const replay = makeRes();
      await refreshSession(makeReq({ body: { refreshToken: firstRefresh } }), replay);
      expect([400, 401]).toContain(replay.statusCode);
    });
  });
}
