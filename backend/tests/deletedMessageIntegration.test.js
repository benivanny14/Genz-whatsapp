/**
 * Integration test: anti-revoke delete → view → restore against a REAL MongoDB.
 *
 * Runs the real controllers + schemas end to end (no model mocks):
 *   1. chatController.deleteMessage(forEveryone)   → scrubbed + originalContent kept
 *   2. genzModsController.getDeletedMessages       → viewer returns the original text
 *   3. genzModsController.restoreDeletedMessage    → content restored in the DB
 *
 * Safe by construction: the suite SKIPS unless MONGO_TEST_URI is explicitly
 * set, and the caller must point it at an ISOLATED database (all three
 * collections are wiped in beforeAll/afterAll).
 */
const mongoose = require('mongoose');

const URI = process.env.MONGO_TEST_URI;

if (!URI) {
  // No isolated DB provided — skip silently so CI without Mongo stays green.
  describe.skip('anti-revoke cycle (integration)', () => {
    it('skipped — set MONGO_TEST_URI to an isolated MongoDB to run', () => {});
  });
} else {
  const User = require('../models/User');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');
  const chat = require('../controllers/chatController');
  const genzMods = require('../controllers/genzModsController');

  const makeRes = () => {
    const res = { statusCode: 200 };
    res.status = jest.fn((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn((body) => {
      res.body = body;
      return res;
    });
    return res;
  };

  describe('anti-revoke cycle (integration)', () => {
    beforeAll(async () => {
      // tests/setup.js may already have connected the default mongoose
      // connection (memory server / local test Mongo). This suite owns the
      // connection for its isolated MONGO_TEST_URI, so drop the shared one
      // first — otherwise mongoose rejects a second connect() with a
      // different connection string.
      await mongoose.disconnect().catch(() => {});
      await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
      await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
    });

    afterAll(async () => {
      // setup.js's afterAll may have already disconnected this connection;
      // guard the wipe so a disconnected pool can't buffer-timeout.
      if (mongoose.connection.readyState === 1) {
        await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
      }
      await mongoose.disconnect().catch(() => {});
    });

    it('delete-for-everyone → viewer → restore keeps the original text', async () => {
      const a = await User.create({
        username: 'it_user_a',
        phoneNumber: '255711000001',
        phoneVerified: true,
        antiRevokeSettings: { antiRevokeEnabled: true, cacheDeletedMessages: true, cacheRetentionDays: 7 }
      });
      const b = await User.create({ username: 'it_user_b', phoneNumber: '255711000002', phoneVerified: true });
      const conv = await Conversation.create({ participants: [a._id, b._id], isGroup: false });
      const msg = await Message.create({
        conversationId: conv._id,
        sender: a._id,
        content: 'Secret hello',
        messageType: 'text'
      });

      // 1. Delete for everyone as the sender.
      const delRes = makeRes();
      await chat.deleteMessage(
        {
          path: '',
          body: { forEveryone: true },
          params: { id: String(msg._id) },
          user: { _id: String(a._id) },
          app: { get: () => undefined }
        },
        delRes
      );
      expect(delRes.statusCode).toBe(200);

      const stored = await Message.findById(msg._id).lean();
      expect(stored.deletedForEveryone).toBe(true);
      expect(stored.content).toBe('[deleted]');
      expect(stored.originalContent).toBe('Secret hello');

      // 2. The deleted-messages viewer surfaces the original text.
      const viewRes = makeRes();
      await genzMods.getDeletedMessages({ user: { _id: String(a._id) } }, viewRes);
      expect(viewRes.statusCode).toBe(200);
      expect(viewRes.body.messages).toHaveLength(1);
      expect(viewRes.body.messages[0].content).toBe('Secret hello');
      expect(String(viewRes.body.messages[0].id)).toBe(String(msg._id));

      // 3. Restore brings the content back in the DB.
      const restRes = makeRes();
      await genzMods.restoreDeletedMessage({ params: { id: String(msg._id) }, user: { _id: String(a._id) } }, restRes);
      expect(restRes.statusCode).toBe(200);

      const restored = await Message.findById(msg._id).lean();
      expect(restored.content).toBe('Secret hello');
      expect(restored.deletedForEveryone).toBe(false);
      expect(restored.deletedAt).toBeNull();
    });
  });
}
