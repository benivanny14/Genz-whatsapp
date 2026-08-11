/**
 * e2e-admin-prep.js
 * -----------------
 * Provisions a deterministic AdminOwner + a seeded CrashReport for the
 * `admin-crash-panel` Playwright spec. The spec computes TOTP codes from the
 * FIXED secret below, so the pair must stay in sync.
 *
 * Run with MONGODB_URI or MONGO_URI set (CI's e2e job passes MONGODB_URI):
 *   node backend/scripts/e2e-admin-prep.js
 */
const mongoose = require('mongoose');
const AdminOwner = require('../models/AdminOwner');
const CrashReport = require('../models/CrashReport');

const URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP'; // fixed base32 secret — spec mirrors it
const USERNAME = 'e2e_admin';
const PASSWORD = 'AdminE2E@2026!';

(async () => {
  if (!URI) {
    console.error('MONGODB_URI (or MONGO_URI) must be set');
    process.exit(1);
  }
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });

  // Fresh owner every run: no lockout state, no failed-attempt residue.
  await AdminOwner.deleteMany({ ownerKey: 'PRIMARY_OWNER' });
  const owner = new AdminOwner({
    ownerKey: 'PRIMARY_OWNER',
    username: USERNAME,
    totpSecret: TOTP_SECRET,
    totpEnabled: true
  });
  await owner.setPassword(PASSWORD);
  await owner.save();

  // Deterministic data for the crash panel assertion.
  await CrashReport.deleteMany({ message: /seeded e2e crash/ });
  await CrashReport.create({
    route: '/genz-mods',
    message: 'seeded e2e crash for the admin panel',
    userId: null
  });

  console.log(`admin prep ok: ${USERNAME} (totp ${TOTP_SECRET}), crash seeded`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('admin prep failed:', err);
  process.exit(1);
});
