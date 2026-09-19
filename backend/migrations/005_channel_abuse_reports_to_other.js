#!/usr/bin/env node
/**
 * Migration 005: Retire the legacy Channels content types on AbuseReport.
 *
 * Run:  node migrations/005_channel_abuse_reports_to_other.js            (apply)
 *       node migrations/005_channel_abuse_reports_to_other.js --dry-run  (count only)
 *       node migrations/005_channel_abuse_reports_to_other.js down      (revert)
 *
 * Background:
 *   The Channels feature was removed from the product (routes, models, socket
 *   handlers, admin screens). Reports that were filed while it existed still
 *   carry `contentType: 'channel' | 'channel_post'`, which is the only reason
 *   those two values were still allowed by the model enum and by the admin
 *   report labels.
 *
 *   This migration rewrites every such report to `contentType: 'other'` and
 *   preserves the original value in `metadata.legacyContentType`, so the
 *   model enum and the admin UI can drop the channel values without losing
 *   the provenance of old reports.
 *
 * NOTE: The report body itself (category, description, status, notes) is never
 * touched. `down()` restores from `metadata.legacyContentType`.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const AbuseReport = require('../models/AbuseReport');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

const LEGACY_CONTENT_TYPES = ['channel', 'channel_post'];

async function connect() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
}

async function up({ dryRun = false } = {}) {
  await connect();

  const filter = { contentType: { $in: LEGACY_CONTENT_TYPES } };
  const total = await AbuseReport.countDocuments({});
  const legacyCount = await AbuseReport.countDocuments(filter);

  console.log(`📋 Abuse reports in collection: ${total}`);
  console.log(`🧹 Reports with a removed Channels content type: ${legacyCount}`);

  if (dryRun) {
    console.log('🔎 Dry run — no documents were modified.');
    await mongoose.disconnect();
    return { total, legacyCount, modifiedCount: 0 };
  }

  if (legacyCount === 0) {
    console.log('⏭️  Nothing to do.');
    await mongoose.disconnect();
    return { total, legacyCount, modifiedCount: 0 };
  }

  const result = await AbuseReport.updateMany(filter, [
    {
      $set: {
        'metadata.legacyContentType': '$contentType',
        contentType: 'other',
      },
    },
  ]);
  const modifiedCount = result.modifiedCount ?? result.nModified ?? 0;

  console.log(`✅ Rewrote ${modifiedCount} report(s) to contentType "other"`);
  await mongoose.disconnect();
  console.log('✅ Migration 005 completed successfully');
  return { total, legacyCount, modifiedCount };
}

async function down() {
  await connect();

  const filter = { 'metadata.legacyContentType': { $in: LEGACY_CONTENT_TYPES } };
  const restoreCount = await AbuseReport.countDocuments(filter);
  console.log(`↩️  Reports to restore: ${restoreCount}`);

  if (restoreCount === 0) {
    console.log('⏭️  Nothing to revert.');
    await mongoose.disconnect();
    return { restoreCount, modifiedCount: 0 };
  }

  const result = await AbuseReport.updateMany(filter, [
    { $set: { contentType: '$metadata.legacyContentType' } },
  ]);
  // Separate pass so `metadata` keeps its other keys but loses the marker
  // (a $$REMOVE inside the same pipeline stage can leave an empty object).
  await AbuseReport.updateMany(
    { 'metadata.legacyContentType': { $exists: true } },
    { $unset: { 'metadata.legacyContentType': '' } },
  );
  const modifiedCount = result.modifiedCount ?? result.nModified ?? 0;

  console.log(`✅ Restored ${modifiedCount} report(s)`);
  await mongoose.disconnect();
  console.log('✅ Migration 005 reverted');
  return { restoreCount, modifiedCount };
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

module.exports = { up, down, LEGACY_CONTENT_TYPES };
