#!/usr/bin/env node
/**
 * Cleanup: Drop the stray, empty `statuses` collection if it exists.
 *
 * Background:
 *   Mongoose maps the `Status` model to the `status` collection (it treats
 *   "status" as uncountable). An older version of migration 003 created its
 *   indexes on a hardcoded `statuses` collection, leaving behind an empty
 *   collection that the application never reads or writes.
 *
 *   Migration 003 was fixed to target `Status.collection.name`; this script
 *   removes the leftover empty collection from databases where it was created.
 *
 * Safety:
 *   - Defaults to a dry run. Nothing is dropped unless you pass `--apply`.
 *   - Refuses to drop a collection that contains documents unless `--force`.
 *   - Aborts if the canonical Status collection resolves to `statuses`
 *     (i.e. the "stray" name would actually be the real data).
 *
 * Usage:
 *   node scripts/cleanup-stray-statuses-collection.js                  (dry run)
 *   node scripts/cleanup-stray-statuses-collection.js --apply          (drop if empty)
 *   node scripts/cleanup-stray-statuses-collection.js --apply --force  (drop even if not empty)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Status = require('../models/Status');

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

const STRAY_COLLECTION = 'statuses';

async function run({ apply = false, force = false } = {}) {
  const canonical = Status.collection.name;

  if (canonical === STRAY_COLLECTION) {
    throw new Error(
      `Refusing to run: the Status model resolves to '${canonical}'. ` +
        'The stray collection name equals the canonical one, so dropping it ' +
        'could delete real data.',
    );
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const collections = await db.listCollections({ name: STRAY_COLLECTION }).toArray();

  if (collections.length === 0) {
    console.log(`⏭️  Collection '${STRAY_COLLECTION}' does not exist. Nothing to do.`);
    await mongoose.disconnect();
    return { existed: false, documents: 0, dropped: false };
  }

  const collection = db.collection(STRAY_COLLECTION);
  const documents = await collection.countDocuments({});
  const indexes = (await collection.indexes().catch(() => [])).map((idx) => idx.name);

  console.log(`📋 Collection '${STRAY_COLLECTION}' exists.`);
  console.log(`   Canonical Status collection: '${canonical}'`);
  console.log(`   Documents: ${documents}`);
  console.log(`   Indexes: ${indexes.join(', ') || '(none)'}`);

  if (documents > 0 && !force) {
    console.log(
      `🛑 Refusing to drop '${STRAY_COLLECTION}': it holds ${documents} document(s). ` +
        'Inspect it manually and re-run with --force only if you are certain it is safe.',
    );
    await mongoose.disconnect();
    return { existed: true, documents, dropped: false };
  }

  if (!apply) {
    console.log(
      '🔎 Dry run — no collections were dropped. Re-run with --apply to drop the collection.',
    );
    await mongoose.disconnect();
    return { existed: true, documents, dropped: false };
  }

  await collection.drop();
  console.log(`✅ Dropped '${STRAY_COLLECTION}' collection.`);
  await mongoose.disconnect();
  return { existed: true, documents, dropped: true };
}

if (require.main === module) {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  run({ apply, force })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Cleanup failed:', err.message);
      process.exit(1);
    });
}

module.exports = { run, STRAY_COLLECTION };
