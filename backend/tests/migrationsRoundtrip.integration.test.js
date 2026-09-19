/**
 * Migration round-trip against a real MongoDB.
 *
 * Every migration is executed the way an operator runs it — as a child process
 * (`node migrations/00X_….js [--dry-run|down]`) with MONGODB_URI pointing at the
 * test database — so the CLI entry point, the argument handling, the exit codes
 * and the env wiring are covered, not just the exported functions.
 *
 * It runs against $MONGO_TEST_URI when set (CI uses the mongodb:7 service
 * container) and falls back to mongodb-memory-server locally, so the same
 * command works everywhere:
 *
 *   npx jest tests/migrationsRoundtrip.integration.test.js --runInBand --forceExit
 *
 * See docs/MIGRATIONS_RUNBOOK.md for the production order (003 → 004 → 005).
 */

// Secrets first: the migration CLIs pull in the models, and the child processes
// inherit this environment (there is no backend/.env on CI runners).
require('./unitEnv.setup');

const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(180000);

const BACKEND_DIR = path.join(__dirname, '..');

let memoryServer = null;
let uri = '';

// Runs a migration (or the runner script) exactly as an operator would.
const runMigration = (relativePath, args = []) => {
  const result = spawnSync(process.execPath, [relativePath, ...args], {
    cwd: BACKEND_DIR,
    env: { ...process.env, MONGODB_URI: uri },
    encoding: 'utf8',
  });
  return {
    code: result.status,
    out: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
};

// A dedicated connection: the shared test setup (tests/setup.js) already owns
// the default mongoose connection, and mongoose refuses a second connect() with
// a different connection string.
const withConnection = async (fn) => {
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    return await fn(connection);
  } finally {
    await connection.close();
  }
};

const withDb = (fn) => withConnection((connection) => fn(connection.db));

const resetDb = () =>
  withDb(async (db) => {
    for (const collection of await db.listCollections().toArray()) {
      await db.collection(collection.name).drop().catch(() => {});
    }
  });

const indexNames = (db, collectionName = 'status') =>
  db
    .collection(collectionName)
    .indexes()
    .then((list) => list.map((index) => index.name))
    .catch(() => []);

beforeAll(async () => {
  if (process.env.MONGO_TEST_URI) {
    uri = process.env.MONGO_TEST_URI;
  } else {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  console.log(`[migrations] target: ${uri}`);

  // The boot hook (services/migrationRunner) reads the *default* mongoose
  // connection and the child processes inherit MONGODB_URI, so both have to
  // point at this file's database instead of the shared test setup's.
  process.env.MONGODB_URI = uri;
  await mongoose.disconnect().catch(() => {});
  await mongoose.connect(uri);
});

const LEGACY_CONTENT_TYPES = ['channel', 'channel_post'];

const seedLegacyFixtures = () =>
  withDb(async (db) => {
    await db.collection('status').insertOne({
      userId: new mongoose.Types.ObjectId(),
      type: 'text',
      content: 'legacy fixture',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });
    await db.collection('abusereports').insertOne({
      contentType: 'channel_post',
      category: 'spam',
      metadata: {},
      createdAt: new Date(),
    });
  });

const legacyReportCount = () =>
  withDb((db) =>
    db.collection('abusereports').countDocuments({ contentType: { $in: LEGACY_CONTENT_TYPES } }),
  );

const recordedMigrationIds = () =>
  withDb((db) =>
    db
      .collection('migrationrecords')
      .find({ id: { $ne: '__lock__' } })
      .project({ id: 1 })
      .toArray()
      .then((rows) => rows.map((row) => row.id))
      .catch(() => []),
  );

afterAll(async () => {
  if (memoryServer) await memoryServer.stop().catch(() => {});
});

beforeEach(async () => {
  await resetDb();
});

describe('migration 003 — Status indexes', () => {
  const INDEX_NAMES = [
    'content_text_caption_text',
    'isRevoked_1_userId_1',
    'archived_1_userId_1',
    'isScheduled_1_scheduledAt_1',
  ];

  test('adds the indexes and drops them again on down', async () => {
    await withDb(async (db) => {
      // Migration 003 tolerates a missing collection, but a real database has one.
      await db.collection('status').insertOne({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'migration fixture',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
    });

    const up = runMigration('migrations/003_status_text_search_indexes.js');
    expect(up.code).toBe(0);

    const afterUp = await withDb((db) => indexNames(db));
    for (const name of INDEX_NAMES) expect(afterUp).toContain(name);

    const down = runMigration('migrations/003_status_text_search_indexes.js', ['down']);
    expect(down.code).toBe(0);

    const afterDown = await withDb((db) => indexNames(db));
    for (const name of INDEX_NAMES) expect(afterDown).not.toContain(name);
  });

  test('is safe to re-run', async () => {
    expect(runMigration('migrations/003_status_text_search_indexes.js').code).toBe(0);
    const second = runMigration('migrations/003_status_text_search_indexes.js');
    expect(second.code).toBe(0);
    expect(second.out).toContain('already exists');
  });
});

describe('migration 004 — empty status polls', () => {
  const createStatusWithEmptyPoll = () =>
    withConnection(async (connection) => {
      // Created through the model on purpose: the nested `poll` defaults are
      // what produce the empty poll object this migration removes.
      const Status = connection.model('Status', require('../models/Status').schema);
      const status = await Status.create({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'status without a poll',
        expiresAt: new Date(Date.now() + 3600000),
      });
      return status._id;
    });

  test('dry-run reports without changing, apply unsets, re-run is a no-op', async () => {
    const id = await createStatusWithEmptyPoll();

    const before = await withDb((db) =>
      db.collection('status').countDocuments({ _id: id, poll: { $exists: true } }),
    );
    expect(before).toBe(1);

    const dry = runMigration('migrations/004_unset_empty_status_poll.js', ['--dry-run']);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain('Dry run');

    const stillThere = await withDb((db) =>
      db.collection('status').countDocuments({ _id: id, poll: { $exists: true } }),
    );
    expect(stillThere).toBe(1);

    const apply = runMigration('migrations/004_unset_empty_status_poll.js');
    expect(apply.code).toBe(0);

    const afterApply = await withDb((db) =>
      db.collection('status').countDocuments({ _id: id, poll: { $exists: true } }),
    );
    expect(afterApply).toBe(0);

    const again = runMigration('migrations/004_unset_empty_status_poll.js');
    expect(again.code).toBe(0);
    expect(again.out).toContain('Nothing to do');

    // Documented irreversible no-op.
    expect(runMigration('migrations/004_unset_empty_status_poll.js', ['down']).code).toBe(0);
  });
});

describe('migration 005 — legacy channel abuse reports', () => {
  const LEGACY_TYPES = ['channel', 'channel_post'];

  // Inserted with the driver because the model enum no longer accepts these
  // values — that is exactly the state production inherited from the Channels
  // feature, so the fixture has to bypass the model.
  const seedLegacyReports = async () => {
    await withDb(async (db) => {
      await db.collection('abusereports').insertMany([
        {
          contentType: 'channel',
          category: 'spam',
          metadata: { source: 'legacy-ui' },
          createdAt: new Date(),
        },
        {
          contentType: 'channel_post',
          category: 'scam',
          metadata: {},
          createdAt: new Date(),
        },
        { contentType: 'message', category: 'spam', metadata: {}, createdAt: new Date() },
      ]);
    });
  };

  const legacyCount = () =>
    withDb((db) =>
      db.collection('abusereports').countDocuments({ contentType: { $in: LEGACY_TYPES } }),
    );

  test('dry-run reports without changing, apply rewrites, down restores', async () => {
    await seedLegacyReports();

    const dry = runMigration('migrations/005_channel_abuse_reports_to_other.js', ['--dry-run']);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain('Channels content type: 2');
    expect(await legacyCount()).toBe(2);

    const apply = runMigration('migrations/005_channel_abuse_reports_to_other.js');
    expect(apply.code).toBe(0);
    expect(apply.out).toContain('Rewrote 2 report(s)');
    expect(await legacyCount()).toBe(0);

    const { markers, preservedMetadata } = await withDb(async (db) => ({
      markers: await db
        .collection('abusereports')
        .countDocuments({ 'metadata.legacyContentType': { $exists: true } }),
      preservedMetadata: await db
        .collection('abusereports')
        .countDocuments({ 'metadata.source': 'legacy-ui' }),
    }));
    expect(markers).toBe(2);
    expect(preservedMetadata).toBe(1);

    const down = runMigration('migrations/005_channel_abuse_reports_to_other.js', ['down']);
    expect(down.code).toBe(0);
    expect(await legacyCount()).toBe(2);

    const markersAfterDown = await withDb((db) =>
      db.collection('abusereports').countDocuments({ 'metadata.legacyContentType': { $exists: true } }),
    );
    expect(markersAfterDown).toBe(0);
  });

  test('re-running apply stays idempotent', async () => {
    await seedLegacyReports();

    expect(runMigration('migrations/005_channel_abuse_reports_to_other.js').code).toBe(0);
    const second = runMigration('migrations/005_channel_abuse_reports_to_other.js');
    expect(second.code).toBe(0);
    expect(second.out).toContain('Nothing to do');
    expect(await legacyCount()).toBe(0);
  });
});

describe('scripts/run-migrations.js (ordered runner)', () => {
  const seedLegacyData = seedLegacyFixtures;
  const legacyReports = legacyReportCount;

  test('dry-run is the default, changes nothing and leaves no bookkeeping collection', async () => {
    await seedLegacyData();

    const dry = runMigration('scripts/run-migrations.js');
    expect(dry.code).toBe(0);
    expect(dry.out).toContain('nothing was changed');

    expect(await legacyReports()).toBe(1);
    const collections = await withDb((db) =>
      db.listCollections().toArray().then((list) => list.map((c) => c.name)),
    );
    expect(collections).not.toContain('migrationrecords');
  });

  test('--apply runs every pending migration in order and records them', async () => {
    await seedLegacyData();

    const applied = runMigration('scripts/run-migrations.js', ['--apply']);
    expect(applied.code).toBe(0);
    expect(applied.out.indexOf('003_status_text_search_indexes')).toBeLessThan(
      applied.out.indexOf('005_channel_abuse_reports_to_other'),
    );

    expect(await legacyReports()).toBe(0);

    const records = await withDb((db) =>
      db
        .collection('migrationrecords')
        .find({})
        .project({ id: 1, appliedAt: 1 })
        .toArray()
        .then((rows) => rows.map((row) => row.id)),
    );
    expect(records).toEqual([
      '003_status_text_search_indexes',
      '004_unset_empty_status_poll',
      '005_channel_abuse_reports_to_other',
    ]);

    const again = runMigration('scripts/run-migrations.js', ['--apply']);
    expect(again.code).toBe(0);
    expect(again.out).toContain('already applied');
    expect(again.out).toContain('Nothing to apply');

    const status = runMigration('scripts/run-migrations.js', ['--status']);
    expect(status.code).toBe(0);
    expect(status.out).toContain('005_channel_abuse_reports_to_other — applied');
  });

  test('includes the legacy migrations only when asked', async () => {
    const withLegacy = runMigration('scripts/run-migrations.js', [
      '--apply',
      '--include-legacy',
    ]);
    expect(withLegacy.code).toBe(0);
    expect(withLegacy.out).toContain('001_status_updates');
    expect(withLegacy.out).toContain('add_status_features');

    const records = await withDb((db) =>
      db
        .collection('migrationrecords')
        .find({})
        .project({ id: 1 })
        .toArray()
        .then((rows) => rows.map((row) => row.id)),
    );
    expect(records).toHaveLength(5);
  });

  test('refuses to touch a non-local database without --allow-remote', () => {
    const remote = spawnSync(process.execPath, ['scripts/run-migrations.js', '--apply'], {
      cwd: BACKEND_DIR,
      env: { ...process.env, MONGODB_URI: 'mongodb://example.com:27017/genz' },
      encoding: 'utf8',
    });
    expect(remote.status).toBe(1);
    expect(`${remote.stdout}${remote.stderr}`).toContain('Refusing');
  });
});

describe('boot migration hook (services/migrationRunner)', () => {
  const { getMigrationStatus, runMigrationsOnBoot } = require('../services/migrationRunner');
  const silentLogger = { log() {}, warn() {}, error() {} };
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMode = process.env.MIGRATIONS_ON_BOOT;

  beforeEach(() => {
    // The boot gate is intentionally inert under NODE_ENV=test; these tests
    // exercise the real behaviour, so step outside it.
    process.env.NODE_ENV = 'development';
    delete process.env.MIGRATIONS_ON_BOOT;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalMode === undefined) delete process.env.MIGRATIONS_ON_BOOT;
    else process.env.MIGRATIONS_ON_BOOT = originalMode;
  });

  test('reports pending migrations and applies them on boot', async () => {
    await seedLegacyFixtures();

    const before = await getMigrationStatus();
    expect(before.pendingIds).toEqual([
      '003_status_text_search_indexes',
      '004_unset_empty_status_poll',
      '005_channel_abuse_reports_to_other',
    ]);

    const boot = await runMigrationsOnBoot({ logger: silentLogger });
    expect(boot.applied).toEqual(before.pendingIds);
    expect(await legacyReportCount()).toBe(0);
    expect(await recordedMigrationIds()).toEqual(before.pendingIds);

    const after = await getMigrationStatus();
    expect(after.pendingCount).toBe(0);
    expect(after.lastAppliedAt).toBeTruthy();
  });

  test('does nothing when MIGRATIONS_ON_BOOT=false or dry-run', async () => {
    await seedLegacyFixtures();

    process.env.MIGRATIONS_ON_BOOT = 'false';
    const off = await runMigrationsOnBoot({ logger: silentLogger });
    expect(off).toMatchObject({ ran: false, reason: 'disabled' });

    process.env.MIGRATIONS_ON_BOOT = 'dry-run';
    const dry = await runMigrationsOnBoot({ logger: silentLogger });
    expect(dry.ran).toBe(true);

    expect(await legacyReportCount()).toBe(1);
    expect(await recordedMigrationIds()).toEqual([]);
  });

  test('skips when another instance holds the lock, and reclaims a stale one', async () => {
    await seedLegacyFixtures();

    await withDb((db) =>
      db.collection('migrationrecords').insertOne({
        id: '__lock__',
        holder: 'other-instance',
        appliedAt: new Date(),
      }),
    );

    const locked = await runMigrationsOnBoot({ logger: silentLogger });
    expect(locked).toMatchObject({ ran: false, reason: 'locked' });
    expect(await legacyReportCount()).toBe(1);

    // A lock older than the TTL belongs to a dead instance and is taken over.
    await withDb((db) =>
      db.collection('migrationrecords').updateOne(
        { id: '__lock__' },
        { $set: { appliedAt: new Date(Date.now() - 11 * 60 * 1000) } },
      ),
    );

    const takenOver = await runMigrationsOnBoot({ logger: silentLogger });
    expect(takenOver.ran).toBe(true);
    expect(await legacyReportCount()).toBe(0);

    const lockLeftBehind = await withDb((db) =>
      db.collection('migrationrecords').countDocuments({ id: '__lock__' }),
    );
    expect(lockLeftBehind).toBe(0);
  });
});

describe('legacy status migrations', () => {
  const LEGACY_MIGRATIONS = [
    'scripts/migrations/001_status_updates.js',
    'migrations/add_status_features.js',
  ];

  test.each(LEGACY_MIGRATIONS)('%s runs and is idempotent on an empty database', async (migration) => {
    await withDb(async (db) => {
      await db.collection('status').insertOne({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'legacy fixture',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
    });

    const first = runMigration(migration);
    expect(first.code).toBe(0);

    const second = runMigration(migration);
    expect(second.code).toBe(0);
  });
});
