#!/usr/bin/env node
/**
 * Backfill schema defaults on documents that dev seeders wrote with the raw
 * MongoDB driver instead of the Mongoose models.
 *
 * Run:  node scripts/backfill-seed-schema-defaults.js            (apply)
 *       node scripts/backfill-seed-schema-defaults.js --dry-run  (count only)
 *       node scripts/backfill-seed-schema-defaults.js --allow-remote (non-local DB)
 *
 * Background:
 *   Older versions of `scripts/seed-test-data.js` wrote straight through
 *   `db.collection(...).insertOne(...)`. Raw driver writes skip Mongoose schema
 *   defaults, so those documents were missing the very fields the read APIs
 *   filter on:
 *
 *   - messages without `deletedForEveryone`
 *       GET /api/chat/conversations/:id/messages filters on
 *       `deletedForEveryone: false`, and MongoDB does NOT match a missing field
 *       against `false` — so the messages existed but were invisible in chat.
 *
 *   - conversations without `isGroup` / `groupName` (legacy `type` + `name`)
 *       Groups are found with `isGroup: true`, so a seeded group never appeared
 *       as a group in the app; private threads lacked `isGroup: false`.
 *
 *   The seeders now write through the models. This script repairs documents
 *   that were already written the old way. It only adds what is missing and
 *   never deletes data.
 *
 * Safe to re-run: documents that already carry the fields are left untouched.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/genz_whatsapp';

// Safety: this tool rewrites app data, so refuse a remote/production database
// unless explicitly forced.
const isLocalMongo = (uri) => {
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};
if (!isLocalMongo(MONGO_URI) && !process.argv.includes('--allow-remote')) {
  console.error('⛔ Refusing to rewrite a non-local MongoDB. Re-run with --allow-remote only if you are certain.');
  process.exit(1);
}

// Boolean flags the read APIs filter on. `$set` (not `$setOnInsert`) so a
// missing field is filled; existing values are never overwritten.
const MESSAGE_FLAGS = {
  deletedForEveryone: false,
  deletedFor: [],
};

async function backfillMessages(dryRun) {
  const total = await Message.countDocuments({});
  console.log(`📋 Messages in collection: ${total}`);

  let modified = 0;
  for (const [field, value] of Object.entries(MESSAGE_FLAGS)) {
    const filter = { [field]: { $exists: false } };
    const count = await Message.countDocuments(filter);
    console.log(`🧹 Messages missing "${field}": ${count}`);
    if (dryRun || count === 0) continue;

    const result = await Message.updateMany(filter, { $set: { [field]: value } });
    modified += result.modifiedCount ?? result.nModified ?? 0;
  }
  return { total, modified };
}

const NON_EMPTY_STRING = { $exists: true, $nin: ['', null] };

async function backfillConversations(dryRun) {
  const total = await Conversation.countDocuments({});
  console.log(`\n📋 Conversations in collection: ${total}`);

  // Legacy groups: raw inserts stored `type: 'group'` + `name` and no
  // `isGroup`, so the app never listed them as groups. Read through the raw
  // handle because `type` / `name` are not schema paths.
  const legacyGroupFilter = {
    isGroup: { $exists: false },
    $or: [
      { type: 'group' },
      { groupName: NON_EMPTY_STRING },
      { name: NON_EMPTY_STRING },
    ],
  };
  const legacyGroups = await Conversation.collection.find(legacyGroupFilter).toArray();
  console.log(`🧹 Legacy groups missing "isGroup": ${legacyGroups.length}`);

  if (!dryRun) {
    for (const group of legacyGroups) {
      await Conversation.updateOne(
        { _id: group._id },
        {
          $set: {
            isGroup: true,
            groupName: group.groupName || group.name || 'Seeded Group',
          },
        },
      );
    }
  }

  // Legacy threads with no group marker at all are private conversations.
  const privateFilter = { isGroup: { $exists: false } };
  const privateCount = await Conversation.countDocuments(privateFilter);
  console.log(`🧹 Conversations missing "isGroup" (marking as private): ${privateCount}`);

  let modified = legacyGroups.length;
  if (!dryRun && privateCount > 0) {
    const result = await Conversation.updateMany(privateFilter, {
      $set: { isGroup: false, groupName: '' },
    });
    modified += result.modifiedCount ?? result.nModified ?? 0;
  }

  // Group metadata the app reads: a group with no admin cannot be managed.
  // `$size: 0` only matches real empty arrays, so missing fields need their own
  // branch (raw-inserted groups have no `admins` key at all).
  const groupsWithoutAdmins = await Conversation.collection
    .find({
      isGroup: true,
      $or: [{ admins: { $size: 0 } }, { admins: { $exists: false } }],
    })
    .toArray();
  console.log(`🧹 Groups with no admins: ${groupsWithoutAdmins.length}`);

  if (!dryRun) {
    for (const group of groupsWithoutAdmins) {
      const admin = group.createdBy || group.participants?.[0];
      if (admin) {
        await Conversation.updateOne({ _id: group._id }, { $set: { admins: [admin] } });
        modified += 1;
      }
    }
  }

  return { total, modified, legacyGroups: legacyGroups.length, privateCount };
}

async function up({ dryRun = false } = {}) {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const messages = await backfillMessages(dryRun);
  const conversations = await backfillConversations(dryRun);

  if (dryRun) {
    console.log('\n🔎 Dry run — no documents were modified.');
  } else {
    console.log(
      `\n✅ Backfilled ${messages.modified} message update(s) and ${conversations.modified} conversation update(s)`,
    );
  }

  await mongoose.disconnect();
  console.log('✅ Backfill completed successfully');
  return { messages, conversations };
}

if (require.main === module) {
  up({ dryRun: process.argv.includes('--dry-run') })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Backfill failed:', err);
      process.exit(1);
    });
}

module.exports = { up, MESSAGE_FLAGS };
