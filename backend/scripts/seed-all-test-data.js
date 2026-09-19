require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Stable tag used as Message.clientMessageId for seeded messages, so re-running
// the seed does not duplicate them.
const SEED_MESSAGE_TAG = 'seed-all-test-data';

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

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('../models/User');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');
  const Status = require('../models/Status');

  const now = Date.now();

  // Get all users
  const admin = await User.findOne({ username: 'BennyIvanny14' });
  const genzUser = await User.findOne({ username: 'GENZ User' });
  const allUsers = await User.find({}).limit(20);

  if (!admin) { console.log('No admin found!'); process.exit(1); }

  console.log('Found users:', allUsers.length);

  // ═══════════════════════════════════════════
  // 1. RICH STATUSES (text, image placeholders)
  // ═══════════════════════════════════════════
  console.log('\n--- Creating rich statuses ---');

  const statusUsers = allUsers.filter(u => String(u._id) !== String(admin._id)).slice(0, 8);
  const statusTexts = [
    { content: 'Habari za asubuhi! Nipo kwenye ofisi, nafanya kazi yangu 💼', bgColor: '#00a884', textColor: '#ffffff' },
    { content: 'Nimepata features mpya za Genz Messenger! Ghost mode ni ya ajabu 👻', bgColor: '#8b5cf6', textColor: '#ffffff' },
    { content: 'Karibu kujiunga na Genz Messenger — Messaging ya kisasa 🚀', bgColor: '#1a73e8', textColor: '#ffffff' },
    { content: 'Update mpya v1.1.21 imefika! Performance improvements 🎉', bgColor: '#e91e63', textColor: '#ffffff' },
    { content: 'Nimepiga picha nzuri na Drawing Tools 🎨', bgColor: '#ff9800', textColor: '#000000' },
    { content: 'Status 72 hours ni nzuri sana! Sina pressure ya ku-delete 💪', bgColor: '#00897b', textColor: '#ffffff' },
    { content: 'Anti-delete feature imeniondolea stress 🛡️', bgColor: '#6200ea', textColor: '#ffffff' },
    { content: 'Multi-device support ni game changer! 📱💻', bgColor: '#d32f2f', textColor: '#ffffff' },
    { content: 'Nimeongeza muziki kwenye status yangu 🎵 Diamond Platnumz', bgColor: '#212121', textColor: '#00c795' },
    { content: 'Privacy controls ni za hali ya juu! Ficha picha na status 📊', bgColor: '#455a64', textColor: '#ffffff' },
    { content: 'Leo nimetumia Winga kununua simu mpya! Bei ni nzuri sana 🛒', bgColor: '#2e7d32', textColor: '#ffffff' },
    { content: 'Group chat yetu inafanya kazi vizuri! 50+ members tayari 👥', bgColor: '#c62828', textColor: '#ffffff' },
    { content: 'Voice messages ni rahisi sana kuliko kuchapa! 🎙️', bgColor: '#4527a0', textColor: '#ffffff' },
    { content: 'Status analytics zinaonyesha 200+ viewers leo! Asanteni 🙏', bgColor: '#00695c', textColor: '#ffffff' },
    { content: 'E2E Encryption inalinda mazungumzo yangu yote 🔐', bgColor: '#1565c0', textColor: '#ffffff' },
    { content: 'App Lock na fingerprint imenifanya nijihisi salama 🔑', bgColor: '#bf360c', textColor: '#ffffff' },
  ];

  const statusDocs = [];
  for (let i = 0; i < statusTexts.length; i++) {
    const user = statusUsers[i % statusUsers.length];
    const st = statusTexts[i];
    statusDocs.push({
      userId: user._id,
      user: user._id,
      type: 'text',
      content: st.content,
      textStatus: {
        text: st.content,
        backgroundColor: st.bgColor,
        fontColor: st.textColor,
        fontStyle: 'normal'
      },
      backgroundColor: st.bgColor,
      textColor: st.textColor,
      privacy: 'contacts',
      createdAt: new Date(now - (i + 1) * 1200000), // 20min apart
      expiresAt: new Date(now + 86400000 * 3 - (i + 1) * 1200000),
      views: []
    });
  }

  const existingStatusKeys = new Set(
    (await Status.find({
      userId: { $in: statusDocs.map((d) => d.userId) },
      content: { $in: statusDocs.map((d) => d.content) }
    }).select('userId content')).map((s) => `${s.userId}:${s.content}`)
  );
  const missingStatusDocs = statusDocs.filter(
    (d) => !existingStatusKeys.has(`${d.userId}:${d.content}`)
  );
  const createdStatuses = missingStatusDocs.length ? await Status.insertMany(missingStatusDocs) : [];
  console.log(createdStatuses.length
    ? `Created ${createdStatuses.length} statuses`
    : '⏭️ Statuses already exist');

  // Make sure admin has bidirectional contacts
  for (const su of statusUsers) {
    await User.findByIdAndUpdate(admin._id, {
      $addToSet: { contacts: { user: su._id, savedName: su.username } }
    });
    await User.findByIdAndUpdate(su._id, {
      $addToSet: { contacts: { user: admin._id, savedName: admin.username } }
    });
  }

  // ═══════════════════════════════════════════
  // 2. GROUP CHAT with 5+ members
  // ═══════════════════════════════════════════
  console.log('\n--- Creating group chats ---');

  const groupMembers = allUsers.slice(0, 6);
  const groupMemberIds = groupMembers.map(u => u._id);

  // Check if group already exists
  let groupChat = await Conversation.findOne({ isGroup: true, groupName: 'Genz Community' });

  if (!groupChat) {
    groupChat = await Conversation.create({
      participants: groupMemberIds,
      isGroup: true,
      groupName: 'Genz Community',
      groupDescription: 'Genz Messenger — Maongezi ya community yetu 🚀',
      groupImage: { url: '/group-genz.png' },
      createdBy: admin._id,
      admins: [admin._id],
      lastMessage: null
    });
    console.log('Created group: Genz Community with', groupMembers.length, 'members');
  }

  // Add group to each member's conversations
  for (const member of groupMembers) {
    await User.findByIdAndUpdate(member._id, {
      $addToSet: { conversations: groupChat._id }
    });
  }

  // Create group messages
  const groupMessages = [
    { sender: groupMembers[0]._id, content: 'Habari za asubuhi everyone! 🌅', time: -5400000 },
    { sender: groupMembers[1]._id, content: 'Nzuri sana! Mnaendaje leo?', time: -5100000 },
    { sender: admin._id, content: 'Sawa! Nimekuja kukuleteeni update mpya ya app 🚀', time: -4800000 },
    { sender: groupMembers[2]._id, content: 'Ndio hiyo! Tungependa kuona features mpya', time: -4500000 },
    { sender: groupMembers[0]._id, content: 'Ghost mode ndio feature bora zaidi! Mmenitumia?', time: -4200000 },
    { sender: admin._id, content: 'Ndiyo! Ghost mode inawaruhusu kutazama status bila kuonekana 👻', time: -3900000 },
    { sender: groupMembers[3]._id, content: 'Wah! Hiyo ni nzuri sana. Anti-delete pia iko?', time: -3600000 },
    { sender: admin._id, content: 'Ndiyo, anti-delete status inaonyesha hata status zilizofutwa 🛡️', time: -3300000 },
    { sender: groupMembers[1]._id, content: 'Genz Messenger ni bora kuliko WhatsApp! 💚', time: -3000000 },
    { sender: groupMembers[4]._id, content: 'Hongera sana team! App ni nzuri sana', time: -2700000 },
    { sender: admin._id, content: 'Asanteni! Tutaendelea kuongezea features kila wiki 🙏', time: -2400000 },
    { sender: groupMembers[2]._id, content: 'Ningependa kuona drawing tools zaidi', time: -2100000 },
    { sender: admin._id, content: 'Tuko kwenye hiyo! Drawing tools zitafika wiki ijayo 🎨', time: -1800000 },
    { sender: groupMembers[0]._id, content: 'Haya basi, tafadhali ongeza na music kwenye status 🎵', time: -1500000 },
    { sender: admin._id, content: 'Music on Status iko tayari! tumia kuongeza wimbo kwenye status 🎶', time: -1200000 },
    { sender: groupMembers[3]._id, content: 'Sawa! Nitajaribu leo. Asanteni sana 🙌', time: -900000 },
    { sender: groupMembers[1]._id, content: 'Winga marketplace pia ni nzuri! Nimenunua phone huko 🛒', time: -600000 },
    { sender: admin._id, content: 'Karibu! Winga ina categories nyingi —Nguo, Simu, Laptop n.k', time: -300000 },
  ];

  let createdGroupMessages = 0;
  for (let i = 0; i < groupMessages.length; i++) {
    const msg = groupMessages[i];
    const clientMessageId = `${SEED_MESSAGE_TAG}:${groupChat._id}:group:${i}`;
    const exists = await Message.findOne({ conversationId: groupChat._id, clientMessageId }).select('_id');
    if (exists) continue;
    await Message.create({
      conversationId: groupChat._id,
      sender: msg.sender,
      clientMessageId,
      content: msg.content,
      type: 'text',
      createdAt: new Date(now + msg.time),
      readBy: [msg.sender]
    });
    createdGroupMessages += 1;
  }

  await Conversation.findByIdAndUpdate(groupChat._id, {
    lastMessage: (await Message.findOne({ conversationId: groupChat._id }).sort({ createdAt: -1 }))._id
  });
  console.log(createdGroupMessages > 0
    ? `Created ${createdGroupMessages} group messages`
    : '⏭️ Group messages already exist');

  // ═══════════════════════════════════════════
  // 3. More private conversations with messages
  // ═══════════════════════════════════════════
  console.log('\n--- Creating rich private conversations ---');

  const privateChats = [
    {
      user: statusUsers[0],
      messages: [
        { from: admin, content: 'Habari amara? 😊' },
        { from: statusUsers[0], content: 'Nzuri sana! wewe?' },
        { from: admin, content: 'Sawa tu. Umeshajaribu Genz Messenger?' },
        { from: statusUsers[0], content: 'Ndiyo! Feature zote ni za ajabu. Ghost mode ndio napenda zaidi 👻' },
        { from: admin, content: 'Hongera! Tutaongeza features zaidi hivi karibuni' },
        { from: statusUsers[0], content: 'Sawa! Nafurahi sana kusikia hivyo 💚' },
      ]
    },
    {
      user: statusUsers[1],
      messages: [
        { from: admin, content: 'Nuru, umeona status mpya?' },
        { from: statusUsers[1], content: 'Ndiyo! Nimeona zako zote. Nzuri sana!' },
        { from: admin, content: 'Asante! Status 72h ni feature muhimu sana' },
        { from: statusUsers[1], content: 'Kweli! Sasa sina pressure ya kufuta status' },
        { from: admin, content: 'Ni sawa kabisa. Anti-delete pia inasaidia' },
      ]
    },
    {
      user: statusUsers[2],
      messages: [
        { from: statusUsers[2], content: 'Admin! Kofi hapa. Tafadhali ongeza feature ya music kwenye status' },
        { from: admin, content: 'Tayari iko! Music on Status imeshafika' },
        { from: statusUsers[2], content: 'Waah! Nimepata. Nitajaribu sasa hivi 🎵' },
        { from: admin, content: 'Sawa! Nisaidie feedback baada ya kuitumia' },
        { from: statusUsers[2], content: 'Nitafanya hivyo. Asante sana! 🙏' },
      ]
    },
    {
      user: statusUsers[3],
      messages: [
        { from: admin, content: 'Chef, habari yako?' },
        { from: statusUsers[3], content: 'Nzuri! Nimekununua simu mpya kupitia Winga 🛒' },
        { from: admin, content: 'Nzuri! Bei ilikuwaje?' },
        { from: statusUsers[3], content: 'Nzuri sana! 30% ndogo kuliko bei ya soko' },
        { from: admin, content: 'Hongera! Winga ina deals nzuri sana' },
      ]
    },
  ];

  for (const chat of privateChats) {
    let conv = await Conversation.findOne({
      isGroup: { $ne: true },
      participants: { $all: [admin._id, chat.user._id] }
    });

    if (!conv) {
      conv = await Conversation.create({
        participants: [admin._id, chat.user._id],
        isGroup: false
      });
    }

    let createdMessages = 0;
    for (let i = 0; i < chat.messages.length; i++) {
      const msg = chat.messages[i];
      const clientMessageId = `${SEED_MESSAGE_TAG}:${conv._id}:${i}`;
      const exists = await Message.findOne({ conversationId: conv._id, clientMessageId }).select('_id');
      if (exists) continue;
      await Message.create({
        conversationId: conv._id,
        sender: msg.from._id,
        clientMessageId,
        content: msg.content,
        type: 'text',
        createdAt: new Date(now - (chat.messages.length - i) * 600000),
        readBy: [msg.from._id]
      });
      createdMessages += 1;
    }

    const lastMsg = await Message.findOne({ conversationId: conv._id }).sort({ createdAt: -1 });
    if (lastMsg) {
      await Conversation.findByIdAndUpdate(conv._id, { lastMessage: lastMsg._id });
    }

    console.log(createdMessages > 0
      ? `Created ${createdMessages} messages with ${chat.user.username}`
      : `⏭️ Messages already exist with ${chat.user.username}`);
  }

  // ═══════════════════════════════════════════
  // 4. WINGA PRODUCTS
  // ═══════════════════════════════════════════
  console.log('\n--- Creating Winga products ---');

  try {
    const Product = require('../models/Product');

    const products = [
      { name: 'iPhone 14 Pro Max', description: '256GB, Space Black, Condition: Like New', price: 2500000, category: 'Simu', location: 'Dar es Salaam', seller: admin._id },
      { name: 'Samsung Galaxy S23', description: '128GB, Green, Full Box', price: 1800000, category: 'Simu', location: 'Nairobi', seller: statusUsers[0]?._id || admin._id },
      { name: 'MacBook Pro 2023', description: 'M2, 16GB RAM, 512GB SSD', price: 4500000, category: 'Laptop', location: 'Dar es Salaam', seller: admin._id },
      { name: 'Dell XPS 15', description: 'i7, 16GB RAM, 512GB SSD, Touch Screen', price: 3200000, category: 'Laptop', location: 'Mombasa', seller: statusUsers[1]?._id || admin._id },
      { name: 'Nike Air Max 2024', description: 'Size 42, Brand New, Black/White', price: 350000, category: 'Viatu', location: 'Dar es Salaam', seller: admin._id },
      { name: 'T-Shirt ya Kihindi', description: 'Cotton 100%, Color: Blue, Size: M-XL', price: 25000, category: 'Nguo', location: 'Arusha', seller: statusUsers[2]?._id || admin._id },
      { name: 'JBL Speaker', description: 'Flip 6, Portable, Waterproof', price: 280000, category: 'Speakers', location: 'Dar es Salaam', seller: admin._id },
      { name: 'PS5 Console', description: 'With 2 Controllers + 3 Games', price: 1500000, category: 'TV', location: 'Dar es Salaam', seller: statusUsers[3]?._id || admin._id },
    ];

    let createdProducts = 0;
    for (const p of products) {
      const exists = await Product.findOne({ name: p.name }).select('_id');
      if (exists) continue;
      await Product.create({
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        location: p.location,
        user: p.seller,
        status: 'active',
        createdAt: new Date(now - Math.random() * 86400000 * 7)
      });
      createdProducts += 1;
    }
    console.log(createdProducts > 0
      ? `Created ${createdProducts} Winga products`
      : '⏭️ Winga products already exist');
  } catch (err) {
    console.log('Product model might not exist, skipping:', err.message);
  }

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  const totalStatuses = await Status.countDocuments();
  const totalMessages = await Message.countDocuments();
  const totalConversations = await Conversation.countDocuments();
  const totalGroups = await Conversation.countDocuments({ isGroup: true });

  console.log('\n═══════════════════════════════════════');
  console.log('SEED COMPLETE!');
  console.log('═══════════════════════════════════════');
  console.log(`Statuses: ${totalStatuses}`);
  console.log(`Messages: ${totalMessages}`);
  console.log(`Conversations: ${totalConversations}`);
  console.log(`Groups: ${totalGroups}`);
  console.log('═══════════════════════════════════════');

  process.exit();
}

seed().catch(e => { console.error(e); process.exit(1); });
