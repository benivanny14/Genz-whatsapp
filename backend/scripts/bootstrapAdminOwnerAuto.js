/**
 * bootstrapAdminOwnerAuto.js
 * ------------------------
 * Automated version of bootstrapAdminOwner.js that accepts command-line arguments
 * Usage: node scripts/bootstrapAdminOwnerAuto.js <username> <password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const AdminOwner = require('../models/AdminOwner');

(async () => {
  try {
    const username = process.argv[2];
    const password = process.argv[3];

    if (!username || !password) {
      console.error('Usage: node scripts/bootstrapAdminOwnerAuto.js <username> <password>');
      console.error('Password must be at least 12 characters');
      process.exit(1);
    }

    if (password.length < 12) {
      console.error('Password must be at least 12 characters');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('FATAL: MONGODB_URI (or MONGO_URI) is not set in your environment.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to database.\n');

    console.log('=== GENZ WhatsApp — Admin Owner Setup ===');
    console.log('This creates/resets the SINGLE admin account for the system.\n');

    let admin = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
    if (!admin) {
      admin = new AdminOwner({ ownerKey: 'PRIMARY_OWNER', username });
    } else {
      console.log(`An admin account already exists (${admin.username}). Overwriting...\n`);
      admin.username = username;
    }

    await admin.setPassword(password);

    const secret = speakeasy.generateSecret({
      name: `GENZ-Admin (${username})`,
      length: 20
    });
    admin.totpSecret = secret.base32;
    admin.totpEnabled = true;
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    admin.refreshTokenHash = null;

    await admin.save();

    console.log('✅ Admin owner account saved successfully.\n');
    console.log('Scan this in Google Authenticator / Authy (or use the manual key below):\n');
    console.log(await qrcode.toString(secret.otpauth_url, { type: 'terminal', small: true }));
    console.log(`Manual entry key: ${secret.base32}\n`);
    console.log('Keep this secret safe. If you lose your authenticator app, re-run this script to reset it.');

    process.exit(0);
  } catch (error) {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  }
})();
