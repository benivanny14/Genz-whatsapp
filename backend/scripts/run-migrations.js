#!/usr/bin/env node
/**
 * Run every known migration in order, dry-run by default.
 *
 *   node scripts/run-migrations.js                 (dry-run: changes nothing)
 *   node scripts/run-migrations.js --apply         (apply pending ones, in order)
 *   node scripts/run-migrations.js --status        (show what this DB has applied)
 *   node scripts/run-migrations.js --apply --force (re-run even applied ones)
 *   node scripts/run-migrations.js --apply --include-legacy
 *   node scripts/run-migrations.js --apply --allow-remote   (non-local DB)
 *
 * The list of migrations and the run logic live in `config/migrations.js` and
 * `services/migrationRunner.js`, shared with the boot path
 * (`MIGRATIONS_ON_BOOT`, see docs/MIGRATIONS_RUNBOOK.md), so the CLI cannot
 * drift from what the server does on startup.
 *
 * `--apply` records each success in the `migrationrecords` collection; a
 * failure stops the run and is not recorded. A dry-run writes nothing at all —
 * not even the bookkeeping collection.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { getMigrationStatus, runMigrations, tail } = require('../services/migrationRunner');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const APPLY = hasFlag('--apply');
const FORCE = hasFlag('--force');
const STATUS_ONLY = hasFlag('--status');
const INCLUDE_LEGACY = hasFlag('--include-legacy');

const isLocalMongo = (uri) => {
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};

async function main() {
  if (!MONGO_URI) {
    console.error('❌ MONGODB_URI is not set.');
    return 1;
  }
  if (!isLocalMongo(MONGO_URI) && !hasFlag('--allow-remote')) {
    console.error(
      '⛔ Refusing to run against a non-local MongoDB. Re-run with --allow-remote only if you are certain.',
    );
    return 1;
  }

  console.log(`🔄 Connecting to MongoDB... (${APPLY ? 'APPLY' : 'dry-run'})`);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  if (STATUS_ONLY) {
    const status = await getMigrationStatus({ includeLegacy: INCLUDE_LEGACY });
    console.log(`=== Migration status (${status.total} known) ===`);
    for (const entry of status.applied) {
      console.log(`✅ ${entry.id} — applied ${new Date(entry.appliedAt).toISOString()}`);
    }
    for (const id of status.pendingIds) {
      console.log(`⏳ ${id} — not applied yet`);
    }
    console.log(`\n${status.appliedCount} applied, ${status.pendingCount} pending`);
    await mongoose.disconnect();
    return 0;
  }

  let appliedNow = 0;
  const { failures } = await runMigrations({
    apply: APPLY,
    force: FORCE,
    includeLegacy: INCLUDE_LEGACY,
    mongoUri: MONGO_URI,
    onEvent: (event) => {
      const label = `${event.migration.id} — ${event.migration.description}`;
      if (event.type === 'skip') console.log(`⏭️  ${label} (already applied, use --force to re-run)`);
      if (event.type === 'no-dry-run') {
        console.log(`⚠️  ${label} (no --dry-run support — read the script, then --apply)`);
      }
      if (event.type === 'start') console.log(`▶️  ${label}`);
      if (event.type === 'done') {
        appliedNow += 1;
        for (const line of event.result.output.split('\n').filter(Boolean)) console.log(`    ${line}`);
        if (APPLY) console.log('    📝 recorded as applied');
        console.log('');
      }
      if (event.type === 'fail') {
        console.log('');
        for (const line of tail(event.result.output, 25).split(' | ')) console.log(`    ${line}`);
        console.error(`\n❌ ${event.migration.id} failed with exit code ${event.result.code} — stopping.`);
      }
      if (event.type === 'record-error') {
        console.log(`    ⚠️  could not record ${event.migration.id}: ${event.error.message}`);
      }
    },
  });

  if (failures === 0) {
    if (APPLY) {
      const status = await getMigrationStatus({ includeLegacy: INCLUDE_LEGACY });
      console.log(
        appliedNow > 0
          ? `=== Applied ${appliedNow} migration(s). ${status.appliedCount} recorded in 'migrationrecords' ===`
          : '=== Nothing to apply — every selected migration is already recorded ===',
      );
    } else {
      console.log('=== Dry-run finished — nothing was changed. Re-run with --apply to apply. ===');
    }
  }

  await mongoose.disconnect();
  return failures === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('❌ Migration runner failed:', err);
    process.exit(1);
  });
