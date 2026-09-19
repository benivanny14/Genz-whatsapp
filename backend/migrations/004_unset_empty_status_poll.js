#!/usr/bin/env node
/**
 * Migration 004: Unset empty `poll` sub-documents from Status collection.
 *
 * Run:  node migrations/004_unset_empty_status_poll.js            (apply)
 *       node migrations/004_unset_empty_status_poll.js --dry-run  (count only)
 *
 * Background:
 *   `Status.poll` is a Mongoose nested path whose sub-fields have defaults
 *   (`allowMultiple: false`, `totalVotes: 0`, `options: []`, `voters: []`).
 *   Any status created without a poll therefore stored an empty poll object,
 *   which clients rendered as an empty overlay.
 *
 *   The model now omits `poll` from toJSON/toObject when it has no question
 *   and no options, so new responses are clean. This migration removes the
 *   leftover field from documents that were already persisted.
 *
 *   A poll is considered real when it has a non-empty `question` OR at least
 *   one entry in `options`. Everything else is unset and carries no data loss.
 *
 * NOTE: This cleanup is intentionally irreversible — the removed `poll`
 * objects contained no meaningful information. `down()` is a documented no-op.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Status = require('../models/Status');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

// Matches documents where `poll` exists (including `poll: null`) but has
// neither a question nor any options — i.e. the empty poll produced by
// Mongoose nested-path defaults.
const EMPTY_POLL_FILTER = {
  poll: { $exists: true },
  $and: [
    {
      $or: [
        { 'poll.question': { $exists: false } },
        { 'poll.question': null },
        { 'poll.question': '' },
      ],
    },
    {
      $or: [
        { 'poll.options': { $exists: false } },
        { 'poll.options': null },
        { 'poll.options': { $size: 0 } },
      ],
    },
  ],
};

async function connect() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
}

async function up({ dryRun = false } = {}) {
  await connect();

  const total = await Status.countDocuments({ poll: { $exists: true } });
  const emptyCount = await Status.countDocuments(EMPTY_POLL_FILTER);

  console.log(`📋 Statuses with a stored "poll" field: ${total}`);
  console.log(`🧹 Statuses with an empty poll to remove: ${emptyCount}`);

  if (dryRun) {
    console.log('🔎 Dry run — no documents were modified.');
    await mongoose.disconnect();
    return { total, emptyCount, modifiedCount: 0 };
  }

  if (emptyCount === 0) {
    console.log('⏭️  Nothing to do.');
    await mongoose.disconnect();
    return { total, emptyCount, modifiedCount: 0 };
  }

  const result = await Status.updateMany(EMPTY_POLL_FILTER, { $unset: { poll: 1 } });
  const modifiedCount = result.modifiedCount ?? result.nModified ?? 0;

  console.log(`✅ Unset empty "poll" on ${modifiedCount} status document(s)`);
  await mongoose.disconnect();
  console.log('✅ Migration 004 completed successfully');
  return { total, emptyCount, modifiedCount };
}

async function down() {
  console.log(
    '⏭️  Nothing to revert: migration 004 only removed empty poll objects, ' +
      'which held no data. Real polls were never touched.',
  );
}

if (require.main === module) {
  const command = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');

  if (command === 'down') {
    down().catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
  } else {
    up({ dryRun })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
      });
  }
}

module.exports = { up, down, EMPTY_POLL_FILTER };
