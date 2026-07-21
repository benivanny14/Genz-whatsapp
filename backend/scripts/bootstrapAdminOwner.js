/**
 * bootstrapAdminOwner.js
 * ------------------------
 * Run this ONCE (or whenever you want to reset your admin credentials) directly
 * on the server, e.g.:
 *
 *   node backend/scripts/bootstrapAdminOwner.js
 *
 * This is the ONLY way to create or reset the admin account. There is no
 * HTTP endpoint that does this — meaning no website visitor, user, or
 * remote attacker can ever create themselves an admin account.
 *
 * You must have shell / SSH / hosting-console access to run this, which
 * only you (the owner) should have.
 */

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const AdminOwner = require('../models/AdminOwner');

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }
    // Basic masked input for password
    const stdin = process.openStdin();
    process.stdin.on('data', () => {});
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
    rl._writeToOutput = function (stringToWrite) {
      if (stringToWrite.charCodeAt(0) === 13) rl.output.write('\n');
      else rl.output.write('*');
    };
  });
}

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('FATAL: MONGODB_URI (or MONGO_URI) is not set in your environment.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to database.\n');

    console.log('=== GENZ WhatsApp — Admin Owner Setup ===');
    console.log('This creates/resets the SINGLE admin account for the system.\n');

    const username = await prompt('Choose an admin username: ');
    const password = await prompt('Choose an admin password (min 12 chars): ', { hidden: true });

    if (!username || password.length < 12) {
      console.error('\nUsername is required and password must be at least 12 characters.');
      process.exit(1);
    }

    let admin = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
    if (!admin) {
      admin = new AdminOwner({ ownerKey: 'PRIMARY_OWNER', username });
    } else {
      const confirm = await prompt(
        `\nAn admin account already exists (${admin.username}). Type "RESET" to overwrite it: `
      );
      if (confirm !== 'RESET') {
        console.log('Aborted. No changes made.');
        process.exit(0);
      }
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

    console.log('\n✅ Admin owner account saved successfully.\n');
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
