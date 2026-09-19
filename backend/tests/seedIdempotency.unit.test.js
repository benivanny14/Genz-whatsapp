/**
 * Proves the dev seeders can safely be re-run:
 *   - scripts/seed-test-data.js
 *   - scripts/seed-all-test-data.js
 *
 * Each seeder is spawned as a child process against an in-memory MongoDB and
 * run twice. Re-running must not change collection counts, and data that the
 * seeder does not own (external status / external message) must survive.
 */

const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(180000);

const BACKEND_DIR = path.join(__dirname, '..');
const SEED_USERS = [
  'admin', 'amara', 'bella_jo', 'chef_tano', 'kofi_code', 'nuru_writes',
  'BennyIvanny14', 'GENZ User', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8',
];

const runSeed = (script, uri) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join('scripts', script)], {
      cwd: BACKEND_DIR,
      env: { ...process.env, MONGODB_URI: uri },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', (code) => resolve({ code, out }));
  });

const withDb = async (uri, fn) => {
  await mongoose.connect(uri);
  try {
    return await fn(mongoose.connection.db);
  } finally {
    await mongoose.disconnect();
  }
};

const resetDb = async (uri) =>
  withDb(uri, async (db) => {
    const existing = await db.listCollections().toArray();
    for (const c of existing) {
      await db.collection(c.name).deleteMany({});
    }
    await db.collection('users').insertMany(
      SEED_USERS.map((username) => ({ _id: new mongoose.Types.ObjectId(), username })),
    );
    // Data the seeder does not own — must never be wiped.
    await db.collection('status').insertOne({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      type: 'text',
      content: 'EXTERNAL STATUS',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    await db.collection('messages').insertOne({
      _id: new mongoose.Types.ObjectId(),
      conversationId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      content: 'EXTERNAL MESSAGE',
      type: 'text',
      createdAt: new Date(),
    });
  });

const snapshot = async (uri) =>
  withDb(uri, async (db) => ({
    statuses: await db.collection('status').countDocuments({}),
    conversations: await db.collection('conversations').countDocuments({}),
    messages: await db.collection('messages').countDocuments({}),
    products: await db.collection('products').countDocuments({}),
    externalStatus: await db.collection('status').countDocuments({ content: 'EXTERNAL STATUS' }),
    externalMessage: await db.collection('messages').countDocuments({ content: 'EXTERNAL MESSAGE' }),
  }));

describe('dev seeders are idempotent', () => {
  let mongo;
  let uri;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  });

  afterAll(async () => {
    await mongo.stop().catch(() => {});
  });

  test('seed-test-data.js re-run adds nothing and keeps external data', async () => {
    await resetDb(uri);

    const first = await runSeed('seed-test-data.js', uri);
    const afterFirst = await snapshot(uri);
    const second = await runSeed('seed-test-data.js', uri);
    const afterSecond = await snapshot(uri);

    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect(afterFirst.statuses).toBeGreaterThan(0);
    expect(afterFirst.messages).toBeGreaterThan(0);
    expect(afterSecond).toEqual(afterFirst);
    expect(afterSecond.externalStatus).toBe(1);
    expect(afterSecond.externalMessage).toBe(1);
    expect(second.out).toContain('⏭️');
  });

  // Regression: the older seeder wrote through the raw MongoDB driver
  // (`db.collection('x').insertOne(...)`), which skips Mongoose schema
  // defaults. The read APIs filter on those defaults, so seeded data was
  // stored in the database yet invisible in the app:
  //   - GET /api/chat/conversations/:id/messages filters
  //     `deletedForEveryone: false`, and MongoDB does NOT match a missing field
  //     against `false`;
  //   - groups are looked up with `isGroup: true`, which a document without the
  //     field never matches.
  test('seeded documents carry the schema fields the read APIs filter on', async () => {
    await resetDb(uri);

    const res = await runSeed('seed-test-data.js', uri);
    expect(res.code).toBe(0);

    const summary = await withDb(uri, async (db) => {
      const conversations = await db.collection('conversations').find({}).toArray();
      const messages = await db
        .collection('messages')
        .find({ content: { $ne: 'EXTERNAL MESSAGE' } })
        .toArray();
      const statuses = await db
        .collection('status')
        .find({ content: { $ne: 'EXTERNAL STATUS' } })
        .toArray();
      const groups = conversations.filter((c) => c.isGroup === true);

      return {
        conversations: conversations.length,
        conversationsWithoutGroupMarker: conversations.filter((c) => !('isGroup' in c)).length,
        groups: groups.length,
        namedGroups: groups.filter((g) => Boolean(g.groupName)).length,
        messages: messages.length,
        messagesVisibleToApi: await db
          .collection('messages')
          .countDocuments({ deletedForEveryone: false }),
        statuses: statuses.length,
        statusesMissingOwnerOrExpiry: statuses.filter((s) => !s.userId || !s.expiresAt).length,
      };
    });

    expect(summary.conversations).toBeGreaterThan(1);
    expect(summary.conversationsWithoutGroupMarker).toBe(0);
    expect(summary.groups).toBe(1);
    expect(summary.namedGroups).toBe(1);
    expect(summary.messages).toBeGreaterThan(0);
    expect(summary.messagesVisibleToApi).toBe(summary.messages);
    expect(summary.statuses).toBeGreaterThan(0);
    expect(summary.statusesMissingOwnerOrExpiry).toBe(0);
  });

  test('seed-all-test-data.js re-run adds nothing and keeps external data', async () => {
    await resetDb(uri);

    const first = await runSeed('seed-all-test-data.js', uri);
    const afterFirst = await snapshot(uri);
    const second = await runSeed('seed-all-test-data.js', uri);
    const afterSecond = await snapshot(uri);

    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect(afterFirst.statuses).toBeGreaterThan(0);
    expect(afterFirst.messages).toBeGreaterThan(0);
    expect(afterFirst.products).toBeGreaterThan(0);
    expect(afterSecond).toEqual(afterFirst);
    expect(afterSecond.externalStatus).toBe(1);
    expect(afterSecond.externalMessage).toBe(1);
    expect(second.out).toContain('⏭️');
  });
});
