/**
 * Integration test: e2e-admin-prep.js is race-safe under concurrency.
 *
 * Spawns prep processes against a REAL MongoDB at the same time (the exact
 * scenario when `admin-crash-panel` and `abuse-report` Playwright specs run
 * in parallel workers). Verifies:
 *   1. concurrent preps with the SAME credentials converge to one owner
 *   2. concurrent preps with PER-SPEC credentials create independent owners
 *      (each reachable via loginStep1's username lookup)
 *   3. an 8-process hammer still converges to one owner + one seeded crash
 *
 * Safe by construction: the suite SKIPS unless MONGO_TEST_URI is explicitly
 * set, and the caller must point it at an ISOLATED database (both collections
 * are wiped in beforeAll/afterAll).
 */
const mongoose = require('mongoose');
const { spawn } = require('node:child_process');
const path = require('node:path');

const URI = process.env.MONGO_TEST_URI;

if (!URI) {
  // No isolated DB provided — skip silently so CI without Mongo stays green.
  describe.skip('e2e-admin-prep race safety (integration)', () => {
    it('skipped — set MONGO_TEST_URI to an isolated MongoDB to run', () => {});
  });
} else {
  const AdminOwner = require('../models/AdminOwner');
  const CrashReport = require('../models/CrashReport');

  // loginStep1 validates that each per-spec owner is reachable by username.
  // Its import needs ADMIN_JWT_SECRET (config/secrets.js); skip the login
  // assertions when the env var is absent so the suite still runs.
  let loginStep1 = null;
  try {
    ({ loginStep1 } = require('../controllers/adminAuthController'));
  } catch {
    loginStep1 = null;
  }

  const PREP_SCRIPT = path.resolve(__dirname, '..', 'scripts', 'e2e-admin-prep.js');
  const DEFAULT_USERNAME = 'e2e_admin';
  const DEFAULT_PASSWORD = 'AdminE2E@2026!';
  const DEFAULT_TOTP = 'JBSWY3DPEHPK3PXP';
  const SEEDED_MESSAGE = /seeded e2e crash for the admin panel/;

  /** Spawn one prep process; resolves with its stdout on exit 0, rejects otherwise. */
  function runPrep(envOverrides = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [PREP_SCRIPT], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, MONGODB_URI: URI, ...envOverrides },
        stdio: 'pipe'
      });
      let out = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (out += d));
      child.on('error', reject);
      child.on('close', (code) =>
        code === 0 ? resolve(out) : reject(new Error(`prep exited ${code}: ${out}`))
      );
    });
  }

  const makeRes = () => {
    const res = { statusCode: 200 };
    res.status = jest.fn((code) => { res.statusCode = code; return res; });
    res.json = jest.fn((body) => { res.body = body; return res; });
    return res;
  };

  describe('e2e-admin-prep race safety (integration)', () => {
    jest.setTimeout(60_000);

    beforeAll(async () => {
      // tests/setup.js may already have connected the default mongoose
      // connection. This suite owns the connection for its isolated
      // MONGO_TEST_URI, so drop the shared one first.
      await mongoose.disconnect().catch(() => {});
      await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
      await Promise.all([AdminOwner.deleteMany({}), CrashReport.deleteMany({})]);
    });

    afterAll(async () => {
      if (mongoose.connection.readyState === 1) {
        await Promise.all([AdminOwner.deleteMany({}), CrashReport.deleteMany({})]);
      }
      await mongoose.disconnect().catch(() => {});
    });

    it('two concurrent preps converge to one owner + one seeded crash', async () => {
      const [a, b] = await Promise.all([runPrep(), runPrep()]);
      expect(a).toContain('admin prep ok');
      expect(b).toContain('admin prep ok');

      const owners = await AdminOwner.find({ ownerKey: 'PRIMARY_OWNER' });
      expect(owners).toHaveLength(1);
      const owner = owners[0];
      expect(owner.username).toBe(DEFAULT_USERNAME);
      expect(owner.totpSecret).toBe(DEFAULT_TOTP);
      expect(owner.totpEnabled).toBe(true);
      expect(await owner.comparePassword(DEFAULT_PASSWORD)).toBe(true);
      expect(await owner.comparePassword('wrong-password-123')).toBe(false);

      // Fresh security state (what delete-then-create used to guarantee).
      expect(owner.failedLoginAttempts).toBe(0);
      expect(owner.lockUntil).toBeNull();
      expect(owner.refreshTokenHash).toBeNull();
      expect(owner.refreshTokenExpiresAt).toBeNull();
      expect(owner.lastLoginAt).toBeNull();

      const crashes = await CrashReport.find({ message: SEEDED_MESSAGE });
      expect(crashes).toHaveLength(1);
      expect(crashes[0].route).toBe('/genz-mods');
    });

    it('per-spec credentials create independent owners, both reachable by username', async () => {
      const specA = {
        E2E_ADMIN_OWNER_KEY: 'E2E_OWNER_CRASH_PANEL',
        E2E_ADMIN_USERNAME: 'e2e_admin_crash',
        E2E_ADMIN_PASSWORD: 'CrashPanelE2E@2026!',
        E2E_ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXA'
      };
      const specB = {
        E2E_ADMIN_OWNER_KEY: 'E2E_OWNER_ABUSE_REPORT',
        E2E_ADMIN_USERNAME: 'e2e_admin_abuse',
        E2E_ADMIN_PASSWORD: 'AbuseReportE2E@2026!',
        E2E_ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXB'
      };

      // Both preps run at the same time with different identities.
      const [a, b] = await Promise.all([runPrep(specA), runPrep(specB)]);
      expect(a).toContain('admin prep ok');
      expect(b).toContain('admin prep ok');

      const owners = await AdminOwner.find({});
      expect(owners).toHaveLength(2);

      // First pass: identity + fully independent, fresh lockout state (before
      // any login attempts below can increment a counter).
      for (const spec of [specA, specB]) {
        const owner = await AdminOwner.findOne({ ownerKey: spec.E2E_ADMIN_OWNER_KEY });
        expect(owner).toBeTruthy();
        expect(owner.username).toBe(spec.E2E_ADMIN_USERNAME);
        expect(owner.totpSecret).toBe(spec.E2E_ADMIN_TOTP_SECRET);
        expect(await owner.comparePassword(spec.E2E_ADMIN_PASSWORD)).toBe(true);
        expect(owner.failedLoginAttempts).toBe(0);
        expect(owner.lockUntil).toBeNull();
      }

      if (loginStep1) {
        // Second pass: the auth gate must resolve EACH owner by its own
        // username — and must NOT let the other spec's username in with this
        // spec's password (independent credentials).
        for (const spec of [specA, specB]) {
          const res = makeRes();
          await loginStep1(
            { body: { username: spec.E2E_ADMIN_USERNAME, password: spec.E2E_ADMIN_PASSWORD }, headers: {}, ip: '127.0.0.1' },
            res
          );
          expect(res.statusCode).toBe(200);
          expect(res.body.requiresTwoFactor).toBe(true);
          expect(res.body.preAuthToken).toBeTruthy();

          const other = spec === specA ? specB : specA;
          const badRes = makeRes();
          await loginStep1(
            { body: { username: other.E2E_ADMIN_USERNAME, password: spec.E2E_ADMIN_PASSWORD }, headers: {}, ip: '127.0.0.1' },
            badRes
          );
          expect(badRes.statusCode).toBe(401);
        }
      }
    });

    it('refuses to run against a non-test database (backdoor guard)', async () => {
      // A production-looking DB name must be rejected BEFORE any write: this
      // script provisions admin credentials that are public in the repo.
      const child = spawn(process.execPath, [PREP_SCRIPT], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:27017/genz-whatsapp' },
        stdio: 'pipe'
      });
      const result = await new Promise((resolve) => {
        let out = '';
        child.stdout.on('data', (d) => (out += d));
        child.stderr.on('data', (d) => (out += d));
        child.on('close', (code) => resolve({ code, out }));
      });
      expect(result.code).not.toBe(0);
      expect(result.out).toMatch(/Refusing to run/);

      // Sanity: our isolated test DB is unaffected, and the guard still
      // allows legitimate test/e2e names (default creds → PRIMARY_OWNER).
      await runPrep();
      expect(await AdminOwner.countDocuments({ ownerKey: 'PRIMARY_OWNER' })).toBe(1);
    });

    it('an 8-process hammer converges to exactly one owner + one seeded crash', async () => {
      const results = await Promise.all(Array.from({ length: 8 }, () => runPrep()));
      for (const out of results) expect(out).toContain('admin prep ok');

      expect(await AdminOwner.countDocuments({ ownerKey: 'PRIMARY_OWNER' })).toBe(1);
      expect(await AdminOwner.countDocuments({})).toBe(1);
      expect(await CrashReport.countDocuments({ message: SEEDED_MESSAGE })).toBe(1);

      const owner = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
      expect(await owner.comparePassword(DEFAULT_PASSWORD)).toBe(true);
      expect(owner.failedLoginAttempts).toBe(0);
    });
  });
}
