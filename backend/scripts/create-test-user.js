#!/usr/bin/env node
/**
 * Create (or repair) a local test user with a password that the API accepts.
 *
 * Run:  node scripts/create-test-user.js
 *       node scripts/create-test-user.js --username=bufftest1 --password=TestPass123!@#
 *       node scripts/create-test-user.js --allow-remote   (non-local DB, be sure)
 *
 * Notes:
 *   - Uses MONGODB_URI from backend/.env. The old version hardcoded
 *     `mongodb://localhost:27017` / database `genz-whatsapp`, so it silently
 *     wrote to a different database than the app reads.
 *   - Goes through the User model and its `setPassword()` helper instead of
 *     hand-rolling scrypt: the hash format is owned by the model (salt:key with
 *     the shared key length), so hand-rolled hashes drift and break login.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const argValue = (name, fallback) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

const USERNAME = argValue('username', process.env.TEST_USER_USERNAME || 'bufftest1');
const PASSWORD = argValue('password', process.env.TEST_USER_PASSWORD || 'TestPass123!@#');
const PHONE = argValue('phone', process.env.TEST_USER_PHONE || '+255711111111');

const isLocalMongo = (uri) => {
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};
if (!isLocalMongo(MONGO_URI) && !process.argv.includes('--allow-remote')) {
  console.error('⛔ Refusing to write to a non-local MongoDB. Re-run with --allow-remote only if you are certain.');
  process.exit(1);
}

async function main() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  let user = await User.findOne({ username: USERNAME });
  const created = !user;

  if (created) {
    user = new User({ username: USERNAME, phoneNumber: PHONE, displayName: 'Buff Test' });
  }

  user.phoneNumber = user.phoneNumber || PHONE;
  user.phoneVerified = true;
  await user.setPassword(PASSWORD);
  await user.save();

  const matches = await user.comparePassword(PASSWORD);
  console.log(`${created ? '✅ Created' : '✅ Updated'} test user: ${user.username} (${user._id})`);
  console.log(`🔑 Login: ${user.username} / ${PASSWORD}`);
  console.log(`🔎 Password verifies: ${matches ? 'yes' : 'NO — check the User model hashing'}`);

  await mongoose.disconnect();
  if (!matches) process.exit(1);
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
