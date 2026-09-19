require('dotenv').config();
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Status = require('../models/Status');

// Stable tag used as Message.clientMessageId for seeded messages, so re-running
// the seed updates nothing instead of duplicating. The app treats an unknown
// clientMessageId as a normal message, so this stays invisible to users.
const SEED_MESSAGE_TAG = 'seed-test-data';
const SEED_GROUP_NAME = 'Genz Test Group 🧪';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/genz-whatsapp';

// Safety: dev seeders must not silently write to a remote/production database.
const isLocalMongo = (uri) => {
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};
if (!isLocalMongo(MONGO_URI) && !process.argv.includes('--allow-remote')) {
  console.error('⛔ Refusing to seed a non-local MongoDB. Re-run with --allow-remote only if you are certain.');
  process.exit(1);
}

// Every write below goes through a Mongoose model on purpose. Raw driver writes
// (`db.collection('x').insertOne`) skip schema defaults, and the read APIs
// filter on those defaults — a message without `deletedForEveryone: false` is
// stored but invisible in chat, and a group without `isGroup: true` never shows
// up as a group.
//   * `db.collection(...)` is used for reads only (looking up users and legacy
//     documents), never for writes.
//   * Existing legacy documents are healed in place instead of duplicated, so
//     re-running this seeder repairs an older dev database.
(async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const admin = await db.collection('users').findOne({ username: 'admin' });
  const users = await db.collection('users')
    .find({ username: { $in: ['amara','bella_jo','chef_tano','kofi_code','nuru_writes'] } })
    .project({ username: 1, _id: 1 })
    .toArray();

  console.log('Admin:', admin.username, admin._id.toString());
  console.log('Other users:', users.map(u => u.username));

  // ── Private conversations ────────────────────────────────────────────────
  // Looked up with `isGroup: { $ne: true }` because the Conversation schema has
  // no `type` path: model-based creates store `isGroup: false`, while documents
  // written by older raw-driver versions of this script carry `type: 'private'`.
  for (const user of users) {
    const existing = await Conversation.findOne({
      isGroup: { $ne: true },
      participants: { $all: [admin._id, user._id] },
    });

    if (!existing) {
      await Conversation.create({
        participants: [admin._id, user._id],
        isGroup: false,
        createdBy: admin._id,
      });
      console.log('✅ Created conversation with', user.username);
    } else {
      console.log('⏭️ Conversation exists with', user.username);
    }
  }

  const convs = await Conversation.find({
    isGroup: { $ne: true },
    participants: admin._id,
  });
  console.log('Total conversations:', convs.length);

  // ── Private messages ────────────────────────────────────────────────────
  // Each gets a deterministic clientMessageId and is skipped if it exists.
  const msgs = [
    'Habari! 🎉', 'Mambo vipi? Leo ni nzuri!',
    'Je, umepakua Genz Messenger? Ni nzuri sana!',
    'Ghost mode ni ya ajabu! 👻',
    'Message hii ni test ya real-time ✅',
    'Pakua APK upate features za ziada! 📲',
    'Status 72h ni nzuri kwa biashara ⏰',
    'Anti-delete feature imenibadilisha! 🛡️'
  ];

  for (const conv of convs.slice(0, 6)) {
    const otherUserId = conv.participants.find(p => String(p) !== String(admin._id));
    const otherUser = users.find(u => String(u._id) === String(otherUserId));
    let inserted = 0;
    for (let i = 0; i < 3; i++) {
      const clientMessageId = `${SEED_MESSAGE_TAG}:${conv._id}:${i}`;
      const exists = await Message.findOne({ conversationId: conv._id, clientMessageId }).select('_id');
      if (exists) continue;
      await Message.create({
        conversationId: conv._id,
        sender: admin._id,
        clientMessageId,
        content: msgs[Math.floor(Math.random() * msgs.length)],
        type: 'text',
        createdAt: new Date(Date.now() + i * 60000),
        status: 'sent'
      });
      inserted += 1;
    }
    const label = otherUser?.username || 'unknown';
    console.log(inserted > 0 ? `✅ Sent ${inserted} messages to ${label}` : `⏭️ Messages already exist with ${label}`);
  }

  // ── Text statuses ───────────────────────────────────────────────────────
  // Skipped when the same owner already has that text.
  const statusTexts = [
    '🎉 Genz Messenger ni app bora zaidi ya messaging!',
    '👻 Ghost mode — tazama status bila kuonekana',
    '🛡️ Anti-delete — hakuna kitu kimefutwa kwako!',
    '⏰ Status 72h — inadumu siku 3 badala ya 1'
  ];
  let createdStatuses = 0;
  for (const text of statusTexts) {
    const exists = await Status.findOne({ userId: admin._id, content: text }).select('_id');
    if (exists) continue;
    await Status.create({
      userId: admin._id,
      user: admin._id,
      username: admin.username || '',
      type: 'text',
      content: text,
      caption: text,
      backgroundColor: '#00a884',
      textColor: '#ffffff',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      views: []
    });
    createdStatuses += 1;
  }
  console.log(createdStatuses > 0
    ? `✅ Created ${createdStatuses} text statuses`
    : '⏭️ Text statuses already exist');

  // ── Group conversation ──────────────────────────────────────────────────
  // Legacy raw-inserted groups stored `type: 'group'` + `name` and had no
  // `isGroup`, so the app never listed them as groups. Look for either shape and
  // heal the legacy one rather than creating a duplicate.
  let groupConv = await db.collection('conversations').findOne({
    $or: [
      { isGroup: true, groupName: SEED_GROUP_NAME },
      { name: SEED_GROUP_NAME },
      { type: 'group', name: SEED_GROUP_NAME }
    ]
  });

  if (!groupConv) {
    groupConv = await Conversation.create({
      participants: [admin._id, ...users.map(u => u._id)],
      isGroup: true,
      groupName: SEED_GROUP_NAME,
      admins: [admin._id],
      createdBy: admin._id
    });
    console.log('✅ Created group:', SEED_GROUP_NAME);
  } else {
    if (!groupConv.isGroup || groupConv.groupName !== SEED_GROUP_NAME) {
      await Conversation.updateOne(
        { _id: groupConv._id },
        {
          $set: {
            isGroup: true,
            groupName: groupConv.groupName || groupConv.name || SEED_GROUP_NAME,
            admins: groupConv.admins?.length ? groupConv.admins : [admin._id],
            createdBy: groupConv.createdBy || admin._id
          }
        }
      );
      console.log('🔧 Healed legacy group record:', SEED_GROUP_NAME);
    } else {
      console.log('⏭️ Group already exists:', SEED_GROUP_NAME);
    }
  }

  let groupInserted = 0;
  for (let i = 0; i < 5; i++) {
    const allIds = [admin._id, ...users.map(u => u._id)];
    const clientMessageId = `${SEED_MESSAGE_TAG}:${groupConv._id}:group:${i}`;
    const exists = await Message.findOne({ conversationId: groupConv._id, clientMessageId }).select('_id');
    if (exists) continue;
    await Message.create({
      conversationId: groupConv._id,
      sender: allIds[i % allIds.length],
      clientMessageId,
      content: msgs[i % msgs.length],
      type: 'text',
      createdAt: new Date(Date.now() + i * 60000),
      status: 'sent'
    });
    groupInserted += 1;
  }
  console.log(groupInserted > 0
    ? `✅ Sent ${groupInserted} messages to group`
    : '⏭️ Group messages already exist');

  const totalConvs = await Conversation.countDocuments({ participants: admin._id });
  const totalMsgs = await Message.countDocuments({ sender: admin._id });
  const totalStatuses = await Status.countDocuments({ userId: admin._id });

  console.log('\n=== SUMMARY ===');
  console.log('Conversations:', totalConvs);
  console.log('Messages sent:', totalMsgs);
  console.log('Statuses:', totalStatuses);

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
