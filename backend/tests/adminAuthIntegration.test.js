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
  const { loginStep1, loginStep2, refreshSession, logout } = require('../controllers/adminAuthController');

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

    it('a NON-PRIMARY owner (per-spec identity) gets working refresh rotation', async () => {
      // Bootstrapped primary + a second per-spec identity.
      await createOwner(); // PRIMARY_OWNER / root_admin
      const specSecret = speakeasy.generateSecret({ length: 20 });
      const specOwner = new AdminOwner({
        ownerKey: 'E2E_OWNER_ABUSE_REPORT',
        username: 'e2e_admin_abuse',
        totpSecret: specSecret.base32,
        totpEnabled: true
      });
      await specOwner.setPassword('AbuseReportE2E@2026!');
      await specOwner.save();

      // Log in as the per-spec owner (loginStep1 resolves by username).
      const step1Res = makeRes();
      await loginStep1(
        makeReq({ body: { username: 'e2e_admin_abuse', password: 'AbuseReportE2E@2026!' } }),
        step1Res
      );
      expect(step1Res.statusCode).toBe(200);
      const step2Res = makeRes();
      await loginStep2(
        makeReq({ body: { preAuthToken: step1Res.body.preAuthToken, code: currentTotp(specSecret.base32) } }),
        step2Res
      );
      expect(step2Res.statusCode).toBe(200);
      const specRefresh = step2Res.body.refreshToken;

      // Refresh must resolve THIS owner (not PRIMARY_OWNER) and rotate.
      const refreshRes = makeRes();
      await refreshSession(makeReq({ body: { refreshToken: specRefresh } }), refreshRes);
      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.body.accessToken).toBeTruthy();
      expect(refreshRes.body.refreshToken).not.toBe(specRefresh);

      const stored = await AdminOwner.findById(specOwner._id);
      expect(stored.verifyRefreshToken(specRefresh)).toBe(false); // old one dead
      expect(stored.verifyRefreshToken(refreshRes.body.refreshToken)).toBe(true); // new one live

      // PRIMARY_OWNER's token (if any) is untouched by the per-spec rotation.
      const primary = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
      expect(primary.verifyRefreshToken(refreshRes.body.refreshToken)).toBe(false);
    });

    it('logout requires a token and revokes it (no PRIMARY_OWNER fallback)', async () => {
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
      const refreshToken = step2Res.body.refreshToken;

      // Missing token → 400, and the session is NOT cleared by the fallback.
      const noToken = makeRes();
      await logout(makeReq(), noToken);
      expect(noToken.statusCode).toBe(400);
      const ownerAfterNoToken = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
      expect(ownerAfterNoToken.verifyRefreshToken(refreshToken)).toBe(true);

      // Logout with the token clears it.
      const out = makeRes();
      await logout(makeReq({ body: { refreshToken } }), out);
      expect(out.statusCode).toBe(200);
      expect(out.body.success).toBe(true);

      // The revoked token can no longer refresh…
      const refreshRes = makeRes();
      await refreshSession(makeReq({ body: { refreshToken } }), refreshRes);
      expect(refreshRes.statusCode).toBe(401);

      // …and logging out with the now-dead token is a 401, not success.
      const again = makeRes();
      await logout(makeReq({ body: { refreshToken } }), again);
      expect(again.statusCode).toBe(401);
    });
  });
}
