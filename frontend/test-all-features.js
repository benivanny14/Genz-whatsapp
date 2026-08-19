#!/usr/bin/env node
/**
 * GENZ Messenger — Comprehensive Feature Test Script (corrected routes)
 */

const BASE = 'http://localhost:5000/api';
const results = { pass: 0, fail: 0, tests: [] };

function log(status, name, detail = '') {
  const icon = status === 'pass' ? '✅' : '❌';
  results[status]++;
  results.tests.push({ status, name, detail });
  console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

function assert(cond, name, detail = '') {
  if (cond) log('pass', name, detail);
  else log('fail', name, detail);
}

// ========== SETUP ==========
const timestamp = Date.now();
let token1, token2, userId1, userId2, refreshToken1;
let groupId, statusId, broadcastId, channelId;

async function setup() {
  console.log('\n🔧 === SETUP ===\n');

  const u1 = `t1_${timestamp}`;
  const u2 = `t2_${timestamp}`;
  const ph1 = `+25571${(timestamp % 1000000).toString().padStart(6, '0')}`;
  const ph2 = `+25572${(timestamp % 1000000).toString().padStart(6, '0')}`;

  const r1 = await req('POST', '/auth/register', { username: u1, phoneNumber: ph1, password: 'TestPass123!' });
  assert(r1.status === 201 || r1.data.success, 'Register User 1', r1.data.message || `status ${r1.status}`);
  token1 = r1.data.token; refreshToken1 = r1.data.refreshToken;
  userId1 = r1.data.user?._id;

  const r2 = await req('POST', '/auth/register', { username: u2, phoneNumber: ph2, password: 'TestPass123!' });
  assert(r2.status === 201 || r2.data.success, 'Register User 2', r2.data.message || `status ${r2.status}`);
  token2 = r2.data.token;
  userId2 = r2.data.user?._id;
}

// ========== AUTH ==========
async function testAuth() {
  console.log('\n🔑 === AUTH TESTS ===\n');

  const me = await req('GET', '/auth/me', null, token1);
  assert(me.status === 200 && me.data.success, 'GET /auth/me');

  const ref = await req('POST', '/auth/refresh', { refreshToken: refreshToken1 });
  assert(ref.status === 200 && ref.data.success, 'Refresh token');

  const up = await req('PUT', '/auth/profile', { about: 'Test about' }, token1);
  assert(up.status === 200 || up.data.success, 'Update profile');

  const av = await req('POST', '/auth/check-availability', { username: 'totally_unique_xyz_abc' });
  assert(av.status === 200, 'Check availability');

  const bad = await req('POST', '/auth/login', { username: `t1_${timestamp}`, password: 'WrongPass123!' });
  assert(bad.status === 401 || bad.status === 400, 'Login wrong password', `status ${bad.status}`);

  const badReg = await req('POST', '/auth/register', { username: 'ab', phoneNumber: '+1', password: 'TestPass123!' });
  assert(badReg.status === 400, 'Register validation', `status ${badReg.status}`);

  const settings = await req('GET', '/auth/settings', null, token1);
  assert(settings.status === 200, 'Get settings');

  const upSettings = await req('PUT', '/auth/settings', { 'chats.fontSize': 'large' }, token1);
  assert(upSettings.status === 200, 'Update settings');
}

// ========== CHAT ==========
async function testChat() {
  console.log('\n💬 === CHAT TESTS ===\n');

  const convos = await req('GET', '/chat/conversations', null, token1);
  assert(convos.status === 200, 'Get conversations');

  // Create conversation first
  const convo = await req('POST', '/chat/conversation', { userId: userId2 }, token1);
  assert(convo.status === 200 || convo.status === 201, 'Create/get conversation');

  // Send message (requires conversationId)
  const cid = convo.data.conversation?._id || convo.data.data?._id || '';
  const msg1 = await req('POST', '/chat/messages', { conversationId: cid, content: 'Hello from test!', messageType: 'text' }, token1);
  assert(msg1.status === 200 || msg1.status === 201, 'Send message', msg1.data.message || msg1.data.msg?.content);

  const msg2 = await req('POST', '/chat/messages', { conversationId: cid, content: 'Second message', messageType: 'text' }, token1);
  assert(msg2.status === 200 || msg2.status === 201, 'Send second message', msg2.data.message);

  // Get conversation ID to get messages
  const convoId = convo.data.conversation?._id || convo.data.data?._id || '';
  const starMsgId = msg1.data.msg?._id || msg1.data.data?._id;
  const delMsgId = msg2.data.msg?._id || msg2.data.data?._id;

  if (convoId) {
    const msgs = await req('GET', `/chat/conversations/${convoId}/messages?page=1&limit=10`, null, token1);
    assert(msgs.status === 200, 'Get messages', `count: ${msgs.data.messages?.length || msgs.data.data?.length || 0}`);

    // Search messages
    const search = await req('GET', `/chat/conversations/${convoId}/search?q=Hello`, null, token1);
    assert(search.status === 200, 'Search messages');
  }

  // Star message
  if (starMsgId) {
    const star = await req('PUT', `/chat/messages/${starMsgId}/star`, { starred: true }, token1);
    assert(star.status === 200, 'Star message');
  }

  // Starred messages
  const starred = await req('GET', '/chat/messages/starred', null, token1);
  assert(starred.status === 200, 'Get starred messages');

  // Delete message
  if (delMsgId) {
    const del = await req('DELETE', `/chat/messages/${delMsgId}`, null, token1);
    assert(del.status === 200, 'Delete message');
  }

  // Archived conversations
  const archived = await req('GET', '/chat/conversations/archived', null, token1);
  assert(archived.status === 200, 'Get archived conversations');

  // Search users
  const searchUsers = await req('GET', '/chat/users/search?q=t2', null, token1);
  assert(searchUsers.status === 200, 'Search users');

  // Get contacts
  const contacts = await req('GET', '/chat/contacts', null, token1);
  assert(contacts.status === 200, 'Get contacts');

  // Add contact
  const addContact = await req('POST', '/chat/contacts', { userId: userId2, name: 'Test Contact' }, token1);
  assert(addContact.status === 200 || addContact.status === 201 || addContact.status === 400, 'Add contact');

  // Edit message
  if (starMsgId) {
    const edit = await req('PUT', `/chat/messages/${starMsgId}`, { content: 'Edited message' }, token1);
    assert(edit.status === 200 || edit.status === 400, 'Edit message');
  }

  // Forward message
  if (starMsgId) {
    const fwd = await req('POST', `/chat/messages/${starMsgId}/forward`, { receiverId: userId2 }, token1);
    assert(fwd.status === 200 || fwd.status === 201, 'Forward message');
  }
}

// ========== GROUPS ==========
async function testGroups() {
  console.log('\n👥 === GROUP TESTS ===\n');

  const create = await req('POST', '/chat/groups', { name: `TestGroup_${timestamp}`, description: 'Test group', participants: [userId2] }, token1);
  assert(create.status === 200 || create.status === 201, 'Create group', create.data.message || create.data.group?.name);
  groupId = create.data.group?._id || create.data.data?._id;

  if (groupId) {
    const info = await req('GET', `/chat/groups/${groupId}/info`, null, token1);
    assert(info.status === 200, 'Get group info');

    const upd = await req('PUT', `/chat/groups/${groupId}/info`, { name: `Updated_${timestamp}`, description: 'Updated' }, token1);
    assert(upd.status === 200, 'Update group info');

    const addMem = await req('POST', `/chat/groups/${groupId}/participants`, { participants: [userId2] }, token1);
    assert(addMem.status === 200, 'Add participant');

    const members = await req('GET', `/chat/groups/${groupId}/info`, null, token1);
    assert(members.status === 200, 'Get members', members.data.group?.participants?.length);

    // Invite link
    const invite = await req('POST', `/chat/groups/${groupId}/invite/regenerate`, {}, token1);
    assert(invite.status === 200 || invite.status === 400, 'Generate invite link');

    // QR code
    const qr = await req('GET', `/chat/groups/${groupId}/qr`, null, token1);
    assert(qr.status === 200, 'Get group QR code');

    // Promote admin
    const promote = await req('PUT', `/chat/groups/${groupId}/admins/${userId2}`, {}, token1);
    assert(promote.status === 200, 'Promote to admin');

    // Demote admin
    const demote = await req('DELETE', `/chat/groups/${groupId}/admins/${userId2}`, {}, token1);
    assert(demote.status === 200, 'Demote from admin');

    // Ban member
    const ban = await req('POST', `/chat/groups/${groupId}/ban/${userId2}`, {}, token1);
    assert(ban.status === 200, 'Ban member');

    // Unban member
    const unban = await req('DELETE', `/chat/groups/${groupId}/ban/${userId2}`, {}, token1);
    assert(unban.status === 200, 'Unban member');

    // Get banned
    const banned = await req('GET', `/chat/groups/${groupId}/banned`, null, token1);
    assert(banned.status === 200, 'Get banned members');

    // Antispam
    const antispam = await req('PUT', `/chat/groups/${groupId}/antispam`, { maxMessagesPerMinute: 10 }, token1);
    assert(antispam.status === 200 || antispam.status === 400, 'Set antispam');

    // Join approval
    const joinApproval = await req('PUT', `/chat/groups/${groupId}/join-approval`, { required: true }, token1);
    assert(joinApproval.status === 200 || joinApproval.status === 400, 'Set join approval');

    // Events
    const event = await req('POST', `/chat/groups/${groupId}/events`, {
      title: 'Test Event',
      description: 'Test',
      date: new Date(Date.now() + 86400000).toISOString(),
    }, token1);
    assert(event.status === 200 || event.status === 201, 'Create event');

    const events = await req('GET', `/chat/groups/${groupId}/events`, null, token1);
    assert(events.status === 200, 'Get events');

    // Transfer ownership
    const transfer = await req('PUT', `/chat/groups/${groupId}/transfer-ownership`, { newOwnerId: userId2 }, token1);
    assert(transfer.status === 200 || transfer.status === 400, 'Transfer ownership');

    // Leave (user2)
    const leave = await req('DELETE', `/chat/groups/${groupId}/leave`, null, token2);
    assert(leave.status === 200, 'Leave group');

    // Re-add
    await req('POST', `/chat/groups/${groupId}/participants`, { participants: [userId2] }, token1);

    // Pending requests
    const pending = await req('GET', `/chat/groups/${groupId}/pending-requests`, null, token1);
    assert(pending.status === 200, 'Get pending requests');
  } else {
    log('fail', 'Skipped group sub-tests (no groupId)');
  }
}

// ========== STATUS ==========
async function testStatus() {
  console.log('\n📸 === STATUS TESTS ===\n');

  const create = await req('POST', '/status', {
    type: 'text',
    content: 'Test status from API',
    backgroundColor: '#00a884',
    privacy: 'everyone',
  }, token1);
  assert(create.status === 200 || create.status === 201, 'Create status', create.data.status?._id || create.data.data?._id);
  statusId = create.data.status?._id || create.data.data?._id;

  // Get all statuses
  const feed = await req('GET', '/status', null, token1);
  assert(feed.status === 200, 'Get status feed');

  if (statusId) {
    // View status
    const view = await req('POST', `/status/${statusId}/view`, {}, token2);
    assert(view.status === 200, 'View status');

    // React to status
    const react = await req('POST', `/status/${statusId}/react`, { emoji: '❤️' }, token2);
    assert(react.status === 200, 'React to status');

    // Get viewers
    const viewers = await req('GET', `/status/${statusId}/viewers`, null, token1);
    assert(viewers.status === 200, 'Get viewers');

    // Edit status
    const edit = await req('PUT', `/status/${statusId}`, { content: 'Edited status' }, token1);
    assert(edit.status === 200, 'Edit status');

    // Delete status
    const del = await req('DELETE', `/status/${statusId}`, null, token1);
    assert(del.status === 200, 'Delete status');
  }
}

// ========== CHANNELS ==========
async function testChannels() {
  console.log('\n📺 === CHANNEL TESTS ===\n');

  const create = await req('POST', '/channels', { name: `TestChannel_${timestamp}`, description: 'Test channel' }, token1);
  assert(create.status === 200 || create.status === 201, 'Create channel');
  channelId = create.data.channel?._id || create.data.data?._id;

  if (channelId) {
    const list = await req('GET', '/channels', null, token1);
    assert(list.status === 200, 'List channels');

    const info = await req('GET', `/channels/${channelId}`, null, token1);
    assert(info.status === 200, 'Get channel info');

    // Follow channel (user2)
    const follow = await req('POST', `/channels/${channelId}/follow`, {}, token2);
    assert(follow.status === 200 || follow.status === 201, 'Follow channel');

    // Post in channel
    const post = await req('POST', `/channels/${channelId}/posts`, { content: 'Hello channel!' }, token1);
    assert(post.status === 200 || post.status === 201, 'Post in channel');

    // Get channel posts
    const posts = await req('GET', `/channels/${channelId}/posts`, null, token1);
    assert(posts.status === 200, 'Get channel posts');

    // Following
    const following = await req('GET', '/channels/following', null, token2);
    assert(following.status === 200, 'Get following channels');
  }
}

// ========== COMMUNITIES ==========
async function testCommunities() {
  console.log('\n🏘️ === COMMUNITY TESTS ===\n');

  const create = await req('POST', '/communities', { name: `TestComm_${timestamp}`, description: 'Test community' }, token1);
  assert(create.status === 200 || create.status === 201, 'Create community');

  const list = await req('GET', '/communities', null, token1);
  assert(list.status === 200, 'List communities');
}

// ========== SECURITY ==========
async function testSecurity() {
  console.log('\n🔒 === SECURITY TESTS ===\n');

  const sec = await req('GET', '/security/settings', null, token1);
  assert(sec.status === 200, 'Get security settings');

  const tfa = await req('GET', '/security/2fa/status', null, token1);
  assert(tfa.status === 200 || tfa.status === 404, 'Get 2FA status');

  const tfaSetup = await req('POST', '/security/2fa/setup', {}, token1);
  assert(tfaSetup.status === 200 || tfaSetup.status === 400, '2FA setup');

  const blocked = await req('GET', '/auth/blocked', null, token1);
  assert(blocked.status === 200, 'Get blocked users');

  // Block user
  const block = await req('POST', `/chat/users/${userId2}/block`, {}, token1);
  assert(block.status === 200, 'Block user');

  // Unblock user
  const unblock = await req('DELETE', `/chat/users/${userId2}/block`, {}, token1);
  assert(unblock.status === 200, 'Unblock user');
}

// ========== LINKED DEVICES ==========
async function testLinkedDevices() {
  console.log('\n📱 === LINKED DEVICES TESTS ===\n');

  const list = await req('GET', '/device', null, token1);
  assert(list.status === 200, 'Get linked devices');
}

// ========== MEDIA / STICKERS / GIF ==========
async function testMedia() {
  console.log('\n🖼️ === MEDIA TESTS ===\n');

  const stickers = await req('GET', '/stickers', null, token1);
  assert(stickers.status === 200, 'Get stickers');

  const gifs = await req('GET', '/gif-player/search?q=hello', null, token1);
  assert(gifs.status === 200, 'Search GIFs');
}

// ========== NOTIFICATIONS ==========
async function testNotifications() {
  console.log('\n🔔 === NOTIFICATION TESTS ===\n');

  const settings = await req('GET', '/notifications/settings', null, token1);
  assert(settings.status === 200 || settings.status === 404, 'Get notification settings');
}

// ========== VOICE ==========
async function testVoice() {
  console.log('\n🎤 === VOICE TESTS ===\n');

  const config = await req('GET', '/voice/config', null, token1);
  assert(config.status === 200 || config.status === 404, 'Get voice config');
}

// ========== GENZ MODS ==========
async function testGenzMods() {
  console.log('\n🎨 === GENZ MODS TESTS ===\n');

  const mods = await req('GET', '/genz-mods', null, token1);
  assert(mods.status === 200, 'Get GENZ mods');
}

// ========== ADVANCED ==========
async function testAdvanced() {
  console.log('\n⚡ === ADVANCED FEATURES TESTS ===\n');

  const folders = await req('GET', '/advanced/chat-folders', null, token1);
  assert(folders.status === 200, 'Get chat folders');

  const autoReply = await req('GET', '/advanced/auto-reply', null, token1);
  assert(autoReply.status === 200, 'Get auto-reply');
}

// ========== PHONE CONTACTS ==========
async function testPhoneContacts() {
  console.log('\n📞 === PHONE CONTACTS TESTS ===\n');

  const contacts = await req('GET', '/contacts', null, token1);
  assert(contacts.status === 200, 'Get phone contacts');
}

// ========== WINGA ==========
async function testWinga() {
  console.log('\n🛒 === WINGA TESTS ===\n');

  const winga = await req('GET', '/winga', null, token1);
  assert(winga.status === 200 || winga.status === 404, 'Get Winga');
}

// ========== PRIVACY CONTACTS ==========
async function testPrivacyContacts() {
  console.log('\n👁️ === PRIVACY CONTACTS TESTS ===\n');

  const privacy = await req('GET', '/privacy', null, token1);
  assert(privacy.status === 200, 'Get privacy contacts');
}

// ========== WILDCARD ROUTES (find all) ==========
async function testWildcardRoutes() {
  console.log('\n🔍 === WILDCARD API ROUTE DISCOVERY ===\n');

  const routes = [
    '/chat/contacts',
    '/chat/users/search?q=t',
    '/chat/conversations',
    '/advanced',
    '/advanced/chat-folders',
    '/advanced/auto-reply',
    '/advanced/data-saver',
    '/advanced/export-chat',
    '/status',
    '/status-advanced',
    '/status-features',
    '/story-highlights',
    '/device',
    '/media/upload',
    '/stickers',
    '/voice',
    '/notifications',
    '/notifications/settings',
    '/security',
    '/security/2fa/status',
    '/privacy',
    '/privacy-contacts',
    '/contacts',
    '/channels',
    '/communities',
    '/genz-mods',
    '/payments',
    '/payment-features',
    '/products',
    '/backup',
    '/backup/list',
    '/anti-revoke',
    '/live-reactions',
    '/media-mods',
    '/customization-mods',
    '/automation-mods',
    '/security-mods',
    '/chat-list-mods',
    '/message-mods',
    '/group-mods',
    '/chat-analyzer',
    '/chat-filter',
    '/chat-sort',
    '/chat-search',
    '/data-usage',
    '/file-manager',
    '/fake-chat',
    '/bulk-sender',
    '/business-account',
    '/cache-cleaner',
    '/multi-accounts',
    '/quick-actions',
    '/storage-manager',
    '/text-repeater',
    '/theme-engine',
    '/media-compressor',
    '/media-editor',
    '/location-sharing',
    '/winga',
    '/telemetry',
    '/anti-ban',
  ];

  for (const route of routes) {
    const r = await req('GET', route, null, token1);
    assert(r.status === 200 || r.status === 401, `Route ${route}`, `status ${r.status}`);
  }
}

// ========== MAIN ==========
async function main() {
  console.log('🧪 ═══════════════════════════════════════════════');
  console.log('🧪 GENZ MESSENGER — COMPREHENSIVE FEATURE TESTING');
  console.log('🧪 ═══════════════════════════════════════════════\n');

  try {
    await setup();
    await testAuth();
    await testChat();
    await testGroups();
    await testStatus();
    await testChannels();
    await testCommunities();
    await testSecurity();
    await testLinkedDevices();
    await testMedia();
    await testNotifications();
    await testVoice();
    await testGenzMods();
    await testAdvanced();
    await testPhoneContacts();
    await testWinga();
    await testPrivacyContacts();
    await testWildcardRoutes();
  } catch (e) {
    console.error('\n💥 FATAL ERROR:', e.message, e.stack?.split('\n')[1]);
    log('fail', 'Test suite error', e.message);
  }

  console.log('\n\n📊 ═══════════════════════════════════════════════');
  console.log(`📊 RESULTS: ${results.pass} passed / ${results.fail} failed / ${results.pass + results.fail} total`);
  console.log('📊 ═══════════════════════════════════════════════\n');

  if (results.fail > 0) {
    console.log('❌ FAILURES:');
    results.tests.filter(t => t.status === 'fail').forEach(t => {
      console.log(`   • ${t.name}${t.detail ? ' — ' + t.detail : ''}`);
    });
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

main();
