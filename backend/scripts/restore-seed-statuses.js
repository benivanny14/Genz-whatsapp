#!/usr/bin/env node
/**
 * Restore the local-dev "seed" statuses that disappeared together with the
 * stray `statuses` collection.
 *
 * These are the same four text statuses that scripts/seed-test-data.js used to
 * insert into the (unused) `statuses` collection. This script recreates them in
 * the canonical Status collection — `Status.collection.name`, which resolves to
 * `status` — with a proper ObjectId owner so the app actually returns them.
 *
 * Recreating the old `statuses` collection on purpose is avoided: the app never
 * reads it, and that is exactly the stray collection removed by
 * scripts/cleanup-stray-statuses-collection.js.
 *
 * Safe to re-run: statuses whose owner + content already exist are skipped.
 *
 * Usage:
 *   node scripts/restore-seed-statuses.js                  (insert missing)
 *   node scripts/restore-seed-statuses.js --dry-run        (preview only)
 *   node scripts/restore-seed-statuses.js --username admin
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Status = require('../models/Status');
const User = require('../models/User');

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

// Same content/marketing copy as seed-test-data.js.
const SEED_STATUS_TEXTS = [
  '🎉 Genz Messenger ni app bora zaidi ya messaging!',
  '👻 Ghost mode — tazama status bila kuonekana',
  '🛡️ Anti-delete — hakuna kitu kimefutwa kwako!',
  '⏰ Status 72h — inadumu siku 3 badala ya 1',
];

async function run({ dryRun = false, username = 'admin' } = {}) {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
  console.log(`   Status collection: '${Status.collection.name}'`);

  const owner = await User.findOne({ username }).select('_id username');
  if (!owner) {
    await mongoose.disconnect();
    throw new Error(`Owner user '${username}' not found; pass --username <name>`);
  }
  console.log(`   Owner: ${owner.username} (${owner._id})`);

  let created = 0;
  let skipped = 0;

  for (const text of SEED_STATUS_TEXTS) {
    const existing = await Status.findOne({ userId: owner._id, content: text }).select('_id');
    if (existing) {
      skipped += 1;
      console.log(`  ⏭️  already present: ${text}`);
      continue;
    }

    if (dryRun) {
      created += 1;
      console.log(`  • would create: ${text}`);
      continue;
    }

    await Status.create({
      userId: owner._id,
      user: owner._id,
      username: owner.username || '',
      type: 'text',
      content: text,
      caption: text,
      backgroundColor: '#00a884',
      textColor: '#ffffff',
      textStatus: {
        text,
        backgroundColor: '#128C7E',
        fontColor: '#FFFFFF',
      },
      privacy: 'contacts',
      statusDuration: 72,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });
    created += 1;
    console.log(`  ✅ created: ${text}`);
  }

  console.log(
    `\n${dryRun ? '🔎 Dry run — nothing written. ' : ''}Created: ${created}, skipped: ${skipped}`,
  );
  await mongoose.disconnect();
  return { created, skipped };
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const usernameArg = process.argv.find((arg) => arg.startsWith('--username=')) || '';
  const username = usernameArg ? usernameArg.split('=')[1] : 'admin';
  run({ dryRun, username })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Restore failed:', err.message);
      process.exit(1);
    });
}

module.exports = { run, SEED_STATUS_TEXTS };
