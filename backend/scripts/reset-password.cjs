#!/usr/bin/env node
/**
 * Reset a user's password (local or production database) using the app's own
 * hashing, then verify the new password actually logs in.
 *
 * Run:  node scripts/reset-password.cjs --username=<name> --password=<new password>
 *       RESET_USERNAME=<name> RESET_PASSWORD=<new password> node scripts/reset-password.cjs
 *
 * Notes:
 *   - Credentials are arguments/env vars, never hardcoded: this script used to
 *     ship a fixed username + password pair in the repository, which is a login
 *     for anyone who can read the source.
 *   - Uses `user.setPassword()`, the same code path the API uses (it enforces
 *     the 12-character minimum), instead of duplicating scrypt parameters here.
 *   - `MONGODB_URI` decides which database is touched. Passwords are never
 *     printed back.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const argValue = (name, fallback) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const USERNAME = argValue('username', process.env.RESET_USERNAME || '');
const PASSWORD = argValue('password', process.env.RESET_PASSWORD || '');

async function main() {
  if (!USERNAME || !PASSWORD) {
    console.error(
      'Usage: node scripts/reset-password.cjs --username=<name> --password=<new password>\n' +
        '   or: RESET_USERNAME=<name> RESET_PASSWORD=<new password> node scripts/reset-password.cjs',
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_whatsapp';
  await mongoose.connect(uri);

  const user = await User.findOne({ username: USERNAME });
  if (!user) {
    console.error(`❌ No user named "${USERNAME}" in ${new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).pathname.replace('/', '')}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await user.setPassword(PASSWORD);
  await user.save();

  const ok = await user.comparePassword(PASSWORD);
  console.log(`✅ Password updated for ${user.username} (${user._id})`);
  console.log(`🔎 Verification: ${ok ? 'SUCCESS' : 'FAILED'}`);

  await mongoose.disconnect();
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
