/**
 * e2e-admin-prep.js
 * -----------------
 * Provisions a deterministic AdminOwner + a seeded CrashReport for the
 * `admin-crash-panel` and `abuse-report` Playwright specs. The specs compute
 * TOTP codes from the FIXED secret below, so the pair must stay in sync.
 *
 * Run with MONGODB_URI or MONGO_URI set (CI's e2e job passes MONGODB_URI):
 *   node backend/scripts/e2e-admin-prep.js
 *
 * RACE-SAFE / IDEMPOTENT: both admin specs call this in their beforeAll and
 * may run in parallel workers, so it must never delete-then-create (a window
 * with no owner → login 401, or duplicate-key on the unique `ownerKey`).
 * Instead it ATOMICALLY UPSERTS:
 *   - AdminOwner by `ownerKey` (unique index — enforced via AdminOwner.init())
 *   - CrashReport by a deterministic _id
 * and explicitly resets lockout/refresh/session state so every run is as
 * fresh as a delete would have been.
 */
const mongoose = require('mongoose');
const AdminOwner = require('../models/AdminOwner');
const CrashReport = require('../models/CrashReport');

const URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Per-spec credentials: each admin spec passes its OWN username/password/TOTP
// secret/ownerKey so parallel specs never share login state (a failed attempt
// or lockout in one spec cannot affect the other). Defaults keep the original
// single-owner behavior for anyone invoking the script without overrides.
const TOTP_SECRET = process.env.E2E_ADMIN_TOTP_SECRET || 'JBSWY3DPEHPK3PXP';
const USERNAME = process.env.E2E_ADMIN_USERNAME || 'e2e_admin';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'AdminE2E@2026!';
const OWNER_KEY = process.env.E2E_ADMIN_OWNER_KEY || 'PRIMARY_OWNER';

// Deterministic ObjectId for the seeded crash report. Both concurrent prep
// runs upsert the SAME _id, so exactly one seeded doc exists at all times
// (never a window where the panel would render empty).
const SEEDED_CRASH_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const SEEDED_CRASH_MESSAGE = 'seeded e2e crash for the admin panel';

/**
 * REFUSES to run against anything but an isolated test/e2e database. This
 * script provisions an AdminOwner with PUBLICLY KNOWN fixed credentials
 * (username/password/TOTP secret live in this repo), so pointing it at a
 * real database would plant a backdoor admin account. Mirrors the
 * e2e/global-setup.js leak guard.
 */
function assertTestDatabase(uri) {
  try {
    const url = new URL(uri.replace('mongodb+srv://', 'mongodb://'));
    const dbName = (url.pathname || '').replace(/^\//, '') || 'test';
    if (!/e2e|test/i.test(dbName)) {
      console.error(
        `Refusing to run: database "${dbName}" does not look like an isolated ` +
        `test/e2e database (expected a name containing 'e2e' or 'test'). ` +
        `This script provisions admin credentials that are public in this repo.`
      );
      process.exit(1);
    }
  } catch {
    console.error('Refusing to run: could not parse the database URI to verify it is an isolated test database.');
    process.exit(1);
  }
}

(async () => {
  if (!URI) {
    console.error('MONGODB_URI (or MONGO_URI) must be set');
    process.exit(1);
  }
  assertTestDatabase(URI);
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });

  // Ensure the unique index on ownerKey exists before relying on the upsert
  // to converge to a single document under concurrency. Model.init() is
  // idempotent — concurrent processes may both call it safely.
  await AdminOwner.init();

  // Hash the password through the model's own setPassword so the stored
  // format matches comparePassword exactly. The throwaway instance never
  // touches the database.
  const tmp = new AdminOwner({ username: USERNAME, totpSecret: TOTP_SECRET });
  await tmp.setPassword(PASSWORD);

  // Atomic upsert: concurrent invocations converge on the same document —
  // no absent-owner window, no duplicate-key on the unique ownerKey. $set
  // resets every piece of security/session state a delete would have cleared.
  await AdminOwner.updateOne(
    { ownerKey: OWNER_KEY },
    {
      $set: {
        username: USERNAME,
        passwordHash: tmp.passwordHash,
        totpSecret: TOTP_SECRET,
        totpEnabled: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        lastLoginAt: null,
        lastLoginIp: null,
        lastLoginUserAgent: null
      }
    },
    { upsert: true }
  );

  // Atomic upsert by deterministic _id — always exactly one seeded crash,
  // refreshed to now so the TTL index keeps it alive and the admin panel
  // shows it first (ordered by createdAt desc).
  await CrashReport.updateOne(
    { _id: SEEDED_CRASH_ID },
    {
      $set: {
        route: '/genz-mods',
        message: SEEDED_CRASH_MESSAGE,
        userId: null,
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  // Never log the TOTP secret (it is fixed and public for e2e, but logging
  // secrets is a habit we should not model).
  console.log(`admin prep ok: ${USERNAME} (owner ${OWNER_KEY}), crash seeded`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('admin prep failed:', err);
  process.exit(1);
});
