/**
 * Backfill E2EE key stamps for messages that predate the stamping feature.
 *
 * For every existing client-side E2EE message lacking e2eeKeyFingerprint,
 * computes the fingerprint of the envelope's senderPublicKey and classifies
 * it as 'current'/'old' against the sender's registered key and
 * encryptionKeyHistory — same logic the send paths now apply at send time.
 *
 * Idempotent and safe to re-run: only messages without a stamp are touched.
 *
 * Usage:  node scripts/backfill-e2ee-stamps.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Message = require('../models/Message');
const User = require('../models/User');
const { isE2EEContent, stampE2EEMessage } = require('../utils/e2eeStamp');

async function run() {
  await connectDB();

  const senderCache = new Map();
  const query = {
    $or: [
      { isClientE2EE: true },
      { content: /^\s*\{/ }
    ],
    e2eeKeyFingerprint: { $exists: false }
  };

  const total = await Message.countDocuments(query);
  if (total === 0) {
    console.log('No unstamped E2EE messages found — nothing to backfill.');
    process.exit(0);
  }
  console.log(`Backfilling ${total} unstamped E2EE message(s)...`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const cursor = Message.find(query).select('_id sender content').cursor({ batchSize: 100 });
  for await (const message of cursor) {
    try {
      const senderId = String(message.sender || '');
      let senderDoc = senderCache.get(senderId);
      if (!senderDoc && senderId) {
        senderDoc = await User.findById(senderId).select('encryptionKeys encryptionKeyHistory');
        senderCache.set(senderId, senderDoc);
      }
      const stamp = isE2EEContent(message.content)
        ? stampE2EEMessage(message.content, senderDoc)
        : null;
      if (stamp) {
        await Message.updateOne(
          { _id: message._id },
          { $set: { e2eeKeyFingerprint: stamp.e2eeKeyFingerprint, e2eeKeyStatus: stamp.e2eeKeyStatus } }
        );
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      failed++;
      console.warn(`Failed to stamp message ${message._id}:`, error.message || error);
    }
  }

  console.log(`Backfill done: ${updated} updated, ${skipped} skipped (no envelope), ${failed} failed.`);
  process.exit(failed ? 2 : 0);
}

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(2);
});
