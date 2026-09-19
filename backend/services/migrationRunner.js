/**
 * Migration runner core, shared by the CLI (`scripts/run-migrations.js`) and by
 * the boot path (`runMigrationsOnBoot`, called from server.js).
 *
 * Design decisions worth knowing:
 *
 * - Each migration runs as a **child process** (`node migrations/00X_….js`).
 *   That is the same path an operator uses, each file's own CLI flags stay the
 *   single source of truth, and the older migrations that call `process.exit()`
 *   cannot kill the server. It also means these scripts never touch the app's
 *   own mongoose connection (they connect and disconnect themselves).
 *
 * - Successful applications are recorded in `migrationrecords`
 *   (models/MigrationRecord.js). Failures are never recorded, so the next run
 *   retries them and the health endpoint keeps reporting them as pending.
 *
 * - Runs are serialised with a lock row in the same collection, because several
 *   instances can boot at the same time during a rolling deploy.
 *
 * - Boot runs are best-effort: a failure is logged loudly and the API still
 *   starts (operators can see the pending list at GET /api/health/migrations).
 */

const path = require('path');
const { spawn, spawnSync } = require('child_process');
const mongoose = require('mongoose');

const {
  MIGRATION_RECORDS_COLLECTION,
  MIGRATION_LOCK_ID,
  MIGRATION_LOCK_TTL_MS,
  selectMigrations,
} = require('../config/migrations');

const BACKEND_DIR = path.join(__dirname, '..');

const tail = (text, lines = 4) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-lines)
    .join(' | ');

const recordsCollection = () => mongoose.connection.db.collection(MIGRATION_RECORDS_COLLECTION);

const readRecords = async () => {
  try {
    return await recordsCollection()
      .find({ id: { $ne: MIGRATION_LOCK_ID } })
      .project({ id: 1, appliedAt: 1, description: 1 })
      .toArray();
  } catch {
    // Collection (or DB) not ready: treat everything as pending rather than
    // crashing a health check.
    return [];
  }
};

/**
 * Which migrations this database has already applied, and which are pending.
 * `pendingIds` is what operators (and /api/health) care about.
 */
const getMigrationStatus = async ({ includeLegacy = false } = {}) => {
  const migrations = selectMigrations({ includeLegacy });
  const records = await readRecords();
  const appliedIds = new Set(records.map((record) => record.id));

  const applied = migrations
    .filter((migration) => appliedIds.has(migration.id))
    .map((migration) => ({
      id: migration.id,
      description: migration.description,
      appliedAt: records.find((record) => record.id === migration.id)?.appliedAt || null,
    }));

  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));

  return {
    total: migrations.length,
    appliedCount: applied.length,
    pendingCount: pending.length,
    pendingIds: pending.map((migration) => migration.id),
    applied,
    lastAppliedAt: applied
      .map((entry) => entry.appliedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || null,
  };
};

// The claim below is only atomic while the unique index on `id` exists, and on
// a database that has never applied a migration the model that declares it may
// not have been loaded yet. Create it before claiming (idempotent).
const ensureRecordsIndex = async () => {
  try {
    await recordsCollection().createIndex({ id: 1 }, { unique: true });
  } catch {
    // Index creation races are harmless: either another instance won, or the
    // index already exists.
  }
};

const acquireLock = async (holder) => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - MIGRATION_LOCK_TTL_MS);

  await ensureRecordsIndex();

  // Step 1: claim by inserting the lock row. The unique index on `id` makes
  // this atomic across instances.
  try {
    await recordsCollection().insertOne({ id: MIGRATION_LOCK_ID, holder, appliedAt: now });
    return true;
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  // Step 2: a lock exists — take it over only if it is stale (instance that
  // died mid-run, TTL expired).
  const takenOver = await recordsCollection().findOneAndUpdate(
    { id: MIGRATION_LOCK_ID, appliedAt: { $lt: staleBefore } },
    { $set: { holder, appliedAt: now } },
  );
  return Boolean(takenOver && (takenOver.value ?? takenOver));
};

const releaseLock = async () => {
  try {
    await recordsCollection().deleteOne({ id: MIGRATION_LOCK_ID });
  } catch {
    // Lock expires on its own.
  }
};

/**
 * Runs one migration as a child process.
 * @param {object} migration entry from config/migrations.js
 * @param {{ dryRun?: boolean, mongoUri?: string }} options
 */
const runMigrationFile = (migration, { dryRun = false, mongoUri } = {}) => {
  const args = [migration.file];
  if (dryRun && migration.supportsDryRun) args.push('--dry-run');

  const startedAt = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: BACKEND_DIR,
    env: mongoUri ? { ...process.env, MONGODB_URI: mongoUri } : process.env,
    encoding: 'utf8',
  });

  return {
    code: result.status,
    durationMs: Date.now() - startedAt,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
};

/** Same as runMigrationFile but non-blocking (used by the boot path). */
const runMigrationFileAsync = (migration, { dryRun = false, mongoUri } = {}) =>
  new Promise((resolve) => {
    const args = [migration.file];
    if (dryRun && migration.supportsDryRun) args.push('--dry-run');

    const startedAt = Date.now();
    const child = spawn(process.execPath, args, {
      cwd: BACKEND_DIR,
      env: mongoUri ? { ...process.env, MONGODB_URI: mongoUri } : process.env,
    });

    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk.toString()));
    child.stderr.on('data', (chunk) => (output += chunk.toString()));
    child.on('error', (error) => {
      resolve({ code: 1, durationMs: Date.now() - startedAt, output: `${output}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      resolve({ code, durationMs: Date.now() - startedAt, output: output.trim() });
    });
  });

/**
 * Runs pending migrations in order.
 *
 * @param {object} options
 * @param {boolean} options.apply        false = dry-run (the default for the CLI)
 * @param {boolean} options.force        re-run migrations that are recorded
 * @param {boolean} options.includeLegacy include 001 / add_status_features
 * @param {string}  options.mongoUri     overrides MONGODB_URI for the children
 * @param {(event: object) => void} options.onEvent progress callback
 * @param {boolean} options.async        spawn children without blocking (boot)
 */
const runMigrations = async ({
  apply = false,
  force = false,
  includeLegacy = false,
  mongoUri,
  onEvent = () => {},
  async: runAsync = false,
} = {}) => {
  const migrations = selectMigrations({ includeLegacy });
  const records = await readRecords();
  const appliedIds = new Set(records.map((record) => record.id));

  const results = [];
  let failures = 0;

  for (const migration of migrations) {
    const alreadyApplied = appliedIds.has(migration.id);

    if (alreadyApplied && !force) {
      onEvent({ type: 'skip', migration });
      continue;
    }
    if (!apply && !migration.supportsDryRun) {
      onEvent({ type: 'no-dry-run', migration });
      continue;
    }

    onEvent({ type: 'start', migration });
    const run = runAsync ? runMigrationFileAsync : runMigrationFile;
    const result = await run(migration, { dryRun: !apply, mongoUri });

    if (result.code !== 0) {
      failures += 1;
      onEvent({ type: 'fail', migration, result });
      break;
    }

    if (apply) {
      try {
        const MigrationRecord = require('../models/MigrationRecord');
        await MigrationRecord.updateOne(
          { id: migration.id },
          {
            $set: {
              id: migration.id,
              description: migration.description,
              appliedAt: new Date(),
              durationMs: result.durationMs,
              output: tail(result.output).slice(0, 500),
            },
          },
          { upsert: true },
        );
      } catch (error) {
        // The migration itself succeeded; failing to record it only means it
        // will run again (they are idempotent) — keep going.
        onEvent({ type: 'record-error', migration, error });
      }
    }

    results.push({ id: migration.id, durationMs: result.durationMs });
    onEvent({ type: 'done', migration, result });
  }

  return { results, failures };
};

/**
 * Boot hook: apply pending migrations (controlled by MIGRATIONS_ON_BOOT).
 *
 *   MIGRATIONS_ON_BOOT=false   → do nothing
 *   MIGRATIONS_ON_BOOT=dry-run → report what would change, write nothing
 *   unset / anything else      → apply pending migrations, record them
 */
const runMigrationsOnBoot = async ({ logger = console } = {}) => {
  const mode = String(process.env.MIGRATIONS_ON_BOOT ?? 'auto').toLowerCase();

  if (process.env.NODE_ENV === 'test' || mode === 'false' || mode === 'off' || mode === 'skip') {
    return { ran: false, reason: 'disabled' };
  }
  if (mongoose.connection.readyState !== 1) {
    return { ran: false, reason: 'mongo-not-connected' };
  }

  const apply = mode !== 'dry-run';
  const holder = `${process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'local'}:${process.pid}`;

  let locked = false;
  try {
    locked = await acquireLock(holder);
  } catch (error) {
    logger.warn?.(`[Migrations] Could not acquire the migration lock: ${error.message}`);
  }

  if (!locked) {
    logger.log?.('[Migrations] Another instance is running migrations — skipping this boot.');
    return { ran: false, reason: 'locked' };
  }

  try {
    const before = await getMigrationStatus();
    if (before.pendingCount === 0) {
      logger.log?.('[Migrations] Database is up to date.');
      return { ran: true, applied: [] };
    }

    logger.log?.(
      `[Migrations] ${before.pendingCount} pending: ${before.pendingIds.join(', ')} ` +
        `(mode: ${apply ? 'apply' : 'dry-run'})`,
    );

    const applied = [];
    const { failures } = await runMigrations({
      apply,
      async: true,
      onEvent: (event) => {
        if (event.type === 'start') logger.log?.(`[Migrations] ▶ ${event.migration.id}`);
        if (event.type === 'skip') logger.log?.(`[Migrations] ⏭ ${event.migration.id} (already applied)`);
        if (event.type === 'no-dry-run') {
          logger.log?.(`[Migrations] ⚠ ${event.migration.id} has no --dry-run support`);
        }
        if (event.type === 'done') {
          applied.push(event.migration.id);
          logger.log?.(`[Migrations] ✅ ${event.migration.id}`);
        }
        if (event.type === 'fail') {
          logger.error?.(
            `[Migrations] ❌ ${event.migration.id} failed (exit ${event.result.code}); ` +
              'API keeps running. Details: ' +
              tail(event.result.output, 3),
          );
        }
        if (event.type === 'record-error') {
          logger.warn?.(`[Migrations] Could not record ${event.migration.id}: ${event.error.message}`);
        }
      },
    });

    if (failures === 0) {
      const after = await getMigrationStatus();
      logger.log?.(
        apply
          ? `[Migrations] Applied ${applied.length} migration(s); ${after.pendingCount} still pending.`
          : '[Migrations] Dry-run finished — nothing was changed.',
      );
    }

    return { ran: true, applied, failures };
  } catch (error) {
    logger.error?.(`[Migrations] Boot migration run failed: ${error.message}`);
    return { ran: false, reason: 'error', error };
  } finally {
    await releaseLock();
  }
};

module.exports = {
  getMigrationStatus,
  runMigrations,
  runMigrationsOnBoot,
  acquireLock,
  releaseLock,
  tail,
};
