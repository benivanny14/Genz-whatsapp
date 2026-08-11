/**
 * GENZ WhatsApp — demo group seeder.
 *
 * Creates a demo group with N members (default 15) and fills it with one
 * message of every supported type, so the UI can be demoed and tested
 * immediately: text, mention, reply, image, sticker, view-once, location,
 * poll (with real votes), and a scheduled message.
 *
 * Usage:
 *   node scripts/seed-demo-group.js [baseUrl] [memberCount]
 *   node scripts/seed-demo-group.js http://localhost:5000 15
 *
 * The script registers fresh users on every run (so it never depends on
 * existing data) and prints the created group's id and message counts.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');
const MEMBER_COUNT = Math.min(parseInt(process.argv[3] || '15', 10) || 15, 100);
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

const PASSWORD = 'GenzDemo@2026!';
const suffix = Date.now().toString(36);
const mkUser = (name) => ({
  username: `demo_${name}_${suffix}`,
  phoneNumber: `79${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
  password: PASSWORD
});

async function request(path, { method = 'GET', token, body, form, raw = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined)
  });
  const data = await res.json().catch(() => ({}));
  if (raw) return { status: res.status, data };
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function registerOrLogin(user) {
  return request('/auth/register', { method: 'POST', body: user }).catch(async (e) => {
    if (e.status === 409 || /already|exists/i.test(e.message)) {
      return request('/auth/login', {
        method: 'POST',
        body: { identifier: user.username, password: user.password }
      });
    }
    throw e;
  });
}

// Tiny valid 1x1 PNG used for the demo image message.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`\n=== DEMO GROUP SEEDER (${MEMBER_COUNT + 1} members, base ${BASE}) ===\n`);

  // 1. Users: 1 creator + N members.
  const creator = await registerOrLogin(mkUser('owner'));
  if (!creator.token) throw new Error('creator registration failed');
  const members = [];
  for (let i = 1; i <= MEMBER_COUNT; i++) {
    const user = mkUser(`m${i}`);
    const m = await registerOrLogin(user);
    const registeredName = m.user?.username || user.username;
    members.push({ ...m, username: registeredName });
  }
  console.log(`  ✓ Registered creator + ${MEMBER_COUNT} members`);

  // 2. Create the group.
  const group = await request('/chat/groups', {
    method: 'POST',
    token: creator.token,
    body: {
      name: `Demo Group ${suffix}`,
      description: 'Demo group created by the seeder — every message type inside.',
      participants: members.map((m) => String(m.user?._id || m.user?.id))
    }
  });
  const conv = group.conversation || group.group || group;
  const convId = String(conv._id || conv.id);
  const memberIds = members.map((m) => String(m.user?._id || m.user?.id));
  console.log(`  ✓ Created group "${conv.name || conv.groupName}" (${memberIds.length + 1} members, id ${convId})`);

  const send = (body) =>
    request('/chat/messages', { method: 'POST', token: creator.token, body });

  // 3. Text.
  const textMsg = await send({ conversationId: convId, content: 'Karibu kwenye demo group!', messageType: 'text' });
  const textId = String(textMsg.message?._id || textMsg._id);

  // 4. Mention (first member).
  const mentionTarget = members[0];
  const mentionName = mentionTarget.username || mentionTarget.user?.username;
  await send({
    conversationId: convId,
    content: `@${mentionName} umementionwa kwenye demo`,
    messageType: 'text',
    mentions: [mentionName]
  });

  // 5. Reply to the first text message.
  await send({
    conversationId: convId,
    content: 'Hii ni reply kwenye ujumbe wa kwanza',
    messageType: 'text',
    replyTo: textId
  });

  // 6. Image (uploaded through the media endpoint).
  const form = new FormData();
  form.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'demo.png');
  const up = await request('/media/upload', { method: 'POST', token: creator.token, form });
  const imageUrl = up.fileUrl || up.data?.fileUrl;
  if (imageUrl) {
    await send({ conversationId: convId, messageType: 'image', content: 'Demo image', mediaUrl: imageUrl });
  } else {
    console.log('  ! image upload skipped (no fileUrl)');
  }

  // 7. Sticker.
  await send({
    conversationId: convId,
    messageType: 'sticker',
    content: '🚀',
    sticker: { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png', emoji: '🚀', animated: false }
  });

  // 8. View-once.
  await send({ conversationId: convId, content: 'Ujumbe huu ni view-once — utatoweka', messageType: 'text', isViewOnce: true });

  // 9. Location.
  await send({
    conversationId: convId,
    content: 'Location: Genz HQ',
    messageType: 'location',
    location: { latitude: -6.7924, longitude: 39.2083, name: 'Genz HQ' }
  });

  // 10. Poll via socket (with a few members voting).
  const { io } = require('socket.io-client');
  const poll = await new Promise((resolve, reject) => {
    const s = io(BASE, { auth: { token: creator.token }, transports: ['websocket'] });
    const t = setTimeout(() => reject(new Error('poll:created timeout')), 10_000);
    s.on('connect', () => {
      s.emit('join:conversation', convId);
      s.once('poll:created', (p) => { clearTimeout(t); resolve(p); s.disconnect(); });
      s.emit('poll:create', {
        conversationId: convId,
        question: 'Demo poll: Genz inafaa?',
        options: ['Ndio!', 'Kabisa!', 'Bila shaka!']
      });
    });
    s.on('connect_error', reject);
  });
  const pollId = String(poll._id || poll.message?._id);
  const voters = members.slice(0, 5);
  for (let i = 0; i < voters.length; i++) {
    const jwt = require('jsonwebtoken');
    const voterToken = jwt.sign(
      { id: String(voters[i].user?._id || voters[i].user?.id) },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    await new Promise((resolve, reject) => {
      const s = io(BASE, { auth: { token: voterToken }, transports: ['websocket'] });
      const t = setTimeout(() => reject(new Error('poll:vote timeout')), 10_000);
      s.on('connect', () => {
        s.emit('join:conversation', convId);
        s.once('poll:voted', () => { clearTimeout(t); resolve(); s.disconnect(); });
        s.emit('poll:vote', { messageId: pollId, optionIndex: i % 3 });
      });
      s.on('connect_error', reject);
    });
  }
  console.log(`  ✓ Poll created + ${voters.length} votes`);

  // 11. Scheduled message (1 hour from now).
  await request('/scheduled-messages', {
    method: 'POST',
    token: creator.token,
    body: {
      conversationId: convId,
      content: 'Ujumbe uliopangwa — utatumwa baada ya saa moja',
      messageType: 'text',
      sendAt: new Date(Date.now() + 3600_000).toISOString()
    }
  });

  // 12. Summary.
  const msgs = await request(`/chat/conversations/${convId}/messages`, { token: creator.token });
  const list = msgs.messages || [];
  const byType = {};
  list.forEach((m) => { byType[m.messageType] = (byType[m.messageType] || 0) + 1; });

  console.log('\n=== DONE ===');
  console.log(`Group name : ${conv.name || conv.groupName}`);
  console.log(`Group id   : ${convId}`);
  console.log(`Members    : ${memberIds.length + 1}`);
  console.log(`Messages   : ${list.length} (${JSON.stringify(byType)})`);
  console.log('\nFungua app, tafuta "Demo Group" kwenye chat list, na uone kila aina ya ujumbe.');
})().catch((e) => {
  console.error('SEEDER FAILED:', e.message);
  process.exit(1);
});
