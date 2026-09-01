require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const admin = await db.collection('users').findOne({ username: 'admin' });
  const users = await db.collection('users')
    .find({ username: { $in: ['amara','bella_jo','chef_tano','kofi_code','nuru_writes'] } })
    .project({ username: 1, _id: 1 })
    .toArray();

  console.log('Admin:', admin.username, admin._id.toString());
  console.log('Other users:', users.map(u => u.username));

  // Create conversations
  for (const user of users) {
    const existing = await db.collection('conversations').findOne({
      type: 'private',
      participants: { $all: [admin._id.toString(), user._id.toString()] }
    });
    if (!existing) {
      await db.collection('conversations').insertOne({
        type: 'private',
        participants: [admin._id.toString(), user._id.toString()],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Created conversation with', user.username);
    } else {
      console.log('⏭️ Conversation exists with', user.username);
    }
  }

  const convs = await db.collection('conversations')
    .find({ participants: admin._id.toString() }).toArray();
  console.log('Total conversations:', convs.length);

  // Send test messages
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
    const otherUserId = conv.participants.find(p => p !== admin._id.toString());
    const otherUser = users.find(u => u._id.toString() === otherUserId);
    for (let i = 0; i < 3; i++) {
      await db.collection('messages').insertOne({
        conversationId: conv._id.toString(),
        sender: admin._id.toString(),
        content: msgs[Math.floor(Math.random() * msgs.length)],
        type: 'text',
        createdAt: new Date(Date.now() + i * 60000),
        status: 'sent'
      });
    }
    console.log('✅ Sent 3 messages to', otherUser?.username || conv.name || 'unknown');
  }

  // Create text statuses
  const statusTexts = [
    '🎉 Genz Messenger ni app bora zaidi ya messaging!',
    '👻 Ghost mode — tazama status bila kuonekana',
    '🛡️ Anti-delete — hakuna kitu kimefutwa kwako!',
    '⏰ Status 72h — inadumu siku 3 badala ya 1'
  ];
  for (const text of statusTexts) {
    await db.collection('statuses').insertOne({
      userId: admin._id.toString(),
      type: 'text',
      content: text,
      backgroundColor: '#00a884',
      textColor: '#ffffff',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      viewers: [],
      caption: text
    });
  }
  console.log('✅ Created', statusTexts.length, 'text statuses');

  // Create group
  const groupConv = await db.collection('conversations').insertOne({
    type: 'group',
    name: 'Genz Test Group 🧪',
    participants: [admin._id.toString(), ...users.map(u => u._id.toString())],
    createdBy: admin._id.toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('✅ Created group: Genz Test Group');

  for (let i = 0; i < 5; i++) {
    const allIds = [admin._id.toString(), ...users.map(u => u._id.toString())];
    await db.collection('messages').insertOne({
      conversationId: groupConv.insertedId.toString(),
      sender: allIds[i % allIds.length],
      content: msgs[i % msgs.length],
      type: 'text',
      createdAt: new Date(Date.now() + i * 60000),
      status: 'sent'
    });
  }
  console.log('✅ Sent 5 messages to group');

  const totalConvs = await db.collection('conversations').countDocuments({ participants: admin._id.toString() });
  const totalMsgs = await db.collection('messages').countDocuments({ sender: admin._id.toString() });
  const totalStatuses = await db.collection('statuses').countDocuments({ userId: admin._id.toString() });

  console.log('\n=== SUMMARY ===');
  console.log('Conversations:', totalConvs);
  console.log('Messages sent:', totalMsgs);
  console.log('Statuses:', totalStatuses);

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
