/**
 * Feature smoke test — hujaribu kila feature kuu ya mfumo kwa kuitumia kweli
 * kupitia API (kama mtumiaji halisi). Run: node scripts/feature-smoke-test.js
 * Requires: backend running on port 5000, MongoDB up.
 */
require('dotenv').config();
// Override with SMOKE_BASE_URL to point at a temp/staging backend
// (e.g. SMOKE_BASE_URL=http://127.0.0.1:5060). Defaults to the local server.
const BASE = process.env.SMOKE_BASE_URL || `http://127.0.0.1:5000`;

const results = { pass: [], fail: [] };
let cookie = '';
let token = '';
const api = {
  async req(method, path, body) {
    const opts = { method, headers: {} };
    if (cookie) opts.headers.Cookie = cookie;
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, opts);
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 300) }; }
    return { status: res.status, json, setCookie: res.headers.get('set-cookie') || '' };
  },
  async upload(path, field, filename, mime, buffer, extraFields = {}) {
    const fd = new FormData();
    fd.append(field, new Blob([buffer], { type: mime }), filename);
    for (const [k, v] of Object.entries(extraFields)) fd.append(k, String(v));
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: fd,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 300) }; }
    return { status: res.status, json };
  }
};

function check(name, cond, r, detailKey) {
  const body = r && r.json ? JSON.stringify(r.json).slice(0, 140) : '';
  const detail = (r && r.json && r.json[detailKey]) || body || '';
  if (cond) { results.pass.push(name); console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); }
  else { results.fail.push(name); console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
  return cond;
}

async function main() {
  console.log(`\n=== FEATURE SMOKE TEST (${BASE}) ===\n`);
  const suffix = Date.now().toString().slice(-8);
  const users = [
    { username: `smoke_a_${suffix}`, phoneNumber: `+2557${suffix}0001`, password: 'TestPass!123' },
    { username: `smoke_b_${suffix}`, phoneNumber: `+2557${suffix}0002`, password: 'TestPass!123' },
    { username: `smoke_c_${suffix}`, phoneNumber: `+2557${suffix}0003`, password: 'TestPass!123' },
  ];
  const ids = {};

  const register = async (u) => {
    const r = await api.req('POST', '/api/auth/register', u);
    return r;
  };
  const loginAs = async (idx) => {
    const r = await api.req('POST', '/api/auth/login', { identifier: users[idx].username, password: users[idx].password });
    cookie = r.setCookie;
    token = r.json.token;
    return r;
  };
  const asUser = async (idx, fn) => {
    await loginAs(idx);
    return fn();
  };

  // ── A. AUTH & ACCOUNT ─────────────────────────────────────────────
  console.log('\n[A] AUTH & ACCOUNT');
  for (let i = 0; i < 3; i++) {
    const r = await register(users[i]);
    check(`register user${i + 1}`, r.status === 201 && r.json.success, r, 'message');
    ids[i] = r.json.user?._id || r.json.user?.id;
  }
  console.log(`     ids: ${JSON.stringify(ids)}`);

  let r = await api.req('POST', '/api/auth/register', users[0]);
  check('duplicate register blocked (409)', r.status === 409, r, 'message');

  r = await api.req('POST', '/api/auth/login', { identifier: users[0].username, password: 'wrong' });
  check('login wrong password → 401', r.status === 401, r, 'message');

  await loginAs(0);
  r = await api.req('GET', '/api/auth/me');
  check('GET /auth/me', r.status === 200 && r.json.success, r, 'message');

  r = await api.req('PUT', '/api/auth/profile', { about: 'Hello from smoke test', displayName: 'Smoke A' });
  check('update profile', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/auth/change-password', { currentPassword: users[0].password, newPassword: 'NewPass!4567', confirmPassword: 'NewPass!4567' });
  check('change password', r.status === 200, r, 'message');
  r = await api.req('POST', '/api/auth/change-password', { currentPassword: 'NewPass!4567', newPassword: users[0].password, confirmPassword: users[0].password });
  check('change password back', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/device');
  check('list devices', r.status === 200 && Array.isArray(r.json.devices), r, 'message');

  r = await api.req('GET', '/api/auth/blocked');
  check('get blocked users', r.status === 200 && Array.isArray(r.json.blockedUsers), r, 'message');

  // ── B. CHAT CORE ───────────────────────────────────────────────────
  console.log('\n[B] CHAT CORE');
  r = await api.req('GET', '/api/chat/conversations');
  check('list conversations', r.status === 200 && Array.isArray(r.json.conversations), r, 'message');

  r = await api.req('POST', '/api/chat/conversation', { userId: ids[1] });
  check('get-or-create 1:1 conversation', r.status === 200 && r.json.conversation, r, 'message');
  const conv = r.json.conversation?._id || r.json.conversation?.id;

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'Hello u2 — smoke test!' });
  check('send text message', r.status === 201 && r.json.message, r, 'message');
  const msg1 = r.json.message?._id || r.json.message?.id;

  r = await api.req('GET', `/api/chat/conversations/${conv}/messages`);
  check('get messages', r.status === 200 && Array.isArray(r.json.messages), r, 'message');

  r = await api.req('PUT', `/api/chat/messages/${msg1}`, { content: 'Edited content' });
  check('edit message', r.status === 200, r, 'message');

  r = await api.req('PUT', `/api/chat/messages/${msg1}/star`, {});
  check('star message', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/chat/messages/starred');
  check('get starred messages', r.status === 200 && Array.isArray(r.json.messages ?? r.json), r, 'message');

  await loginAs(1);
  r = await api.req('POST', `/api/chat/messages/${msg1}/reactions`, { emoji: '🔥' });
  check('react to message', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'A reply', replyTo: msg1 });
  check('reply to message', r.status === 201, r, 'message');

  r = await api.req('POST', `/api/chat/messages/${msg1}/forward`, { targetConversationIds: [conv] });
  check('forward message', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('PUT', `/api/chat/messages/${msg1}/read`, {});
  check('mark as read', r.status === 200, r, 'message');

  r = await api.req('GET', `/api/chat/conversations/${conv}/search?query=Hello`);
  check('search messages in chat', r.status === 200 && Array.isArray(r.json.messages), r, 'message');

  r = await api.req('PUT', `/api/chat/conversations/${conv}/pin`, {});
  check('pin conversation', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/conversations/${conv}/archive`, {});
  check('archive conversation', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/chat/conversations/archived');
  check('get archived conversations', r.status === 200 && Array.isArray(r.json.conversations), r, 'message');
  r = await api.req('PUT', `/api/chat/conversations/${conv}/archive`, {});
  check('unarchive conversation', r.status === 200, r, 'message');

  await loginAs(0);
  r = await api.req('DELETE', `/api/chat/messages/${msg1}/delete-for-everyone`, {});
  check('delete for everyone (sender)', r.status === 200, r, 'message');
  await loginAs(1);

  // ── C. MEDIA ───────────────────────────────────────────────────────
  console.log('\n[C] MEDIA');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  r = await api.upload('/api/media/upload/image', 'image', 'test.png', 'image/png', png);
  check('upload image', r.status === 200 || r.status === 201, r, 'message');
  const mediaUrl = r.json.fileUrl || r.json.url;

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, mediaUrl, mediaType: 'image', caption: 'A test image' });
  check('send media message', r.status === 201 && r.json.message, r, 'message');

  r = await api.req('GET', `/api/chat/conversations/${conv}/media`);
  check('media gallery', r.status === 200 && Array.isArray(r.json.media), r, 'message');

  // ── D. GROUPS ──────────────────────────────────────────────────────
  console.log('\n[D] GROUPS');
  await loginAs(0);
  r = await api.req('POST', '/api/chat/groups', { name: `Smoke Group ${suffix}`, participants: [ids[1]] });

  check('create group', r.status === 201 && (r.json.group || r.json.conversation), r, 'message');
  const gid = r.json.group?._id || r.json.group?.id || r.json.conversation?._id || r.json.conversation?.id;

  r = await api.req('GET', `/api/chat/groups/${gid}/info`);
  check('get group info', r.status === 200 && (r.json.group || r.json.groupInfo), r, 'message');

  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { name: 'Smoke Group Renamed', description: 'desc' });
  check('update group info', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/chat/groups/${gid}/participants`, { userId: ids[2] });
  check('add participant', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('PUT', `/api/chat/groups/${gid}/admins/${ids[1]}`, {});
  check('make admin', r.status === 200, r, 'message');

  r = await api.req('DELETE', `/api/chat/groups/${gid}/admins/${ids[1]}`, {});
  check('remove admin', r.status === 200, r, 'message');

  r = await api.req('GET', `/api/chat/groups/${gid}/qr`);
  check('group QR code', r.status === 200 && (r.json.qrCode || r.json.qr || r.json.dataUrl), r, 'message');

  r = await api.req('POST', `/api/chat/groups/${gid}/invite/regenerate`, {});
  check('regenerate invite', r.status === 200, r, 'message');
  const invite = r.json.inviteCode || r.json.invite?.code || r.json.code;

  // remove u3 first, then u3 joins via invite link
  r = await api.req('DELETE', `/api/chat/groups/${gid}/participants/${ids[2]}`, {});
  await loginAs(2);
  r = await api.req('POST', `/api/chat/groups/${gid}/join`, { inviteCode: invite });
  check('join group via invite', r.status === 200 || r.status === 201, r, 'message');
  await loginAs(0);

  await loginAs(0);
  r = await api.req('POST', '/api/chat/messages', { conversationId: gid, content: 'Hello group!' });
  check('send group message', r.status === 201, r, 'message');

  await loginAs(2);
  r = await api.req('DELETE', `/api/chat/groups/${gid}/leave`, {});
  check('leave group (u3)', r.status === 200, r, 'message');

  await loginAs(0);
  r = await api.req('POST', `/api/chat/groups/${gid}/ban/${ids[2]}`, {});
  check('ban member', r.status === 200, r, 'message');
  r = await api.req('DELETE', `/api/chat/groups/${gid}/ban/${ids[2]}`, {});
  check('unban member', r.status === 200, r, 'message');

  r = await api.req('DELETE', `/api/chat/groups/${gid}/participants/${ids[2]}`, {});
  check('remove participant', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/chat/groups/${gid}/events`, { title: 'Game night', date: new Date(Date.now() + 86400000).toISOString() });
  check('create group event', r.status === 201 || r.status === 200, r, 'message');
  const evt = r.json.event?._id || r.json.event?.id;
  if (evt) {
    r = await api.req('POST', `/api/chat/groups/${gid}/events/${evt}/rsvp`, { status: 'going' });
    check('rsvp to event', r.status === 200, r, 'message');
  }

  // ── E. STATUS ──────────────────────────────────────────────────────
  console.log('\n[E] STATUS');
  r = await api.req('POST', '/api/status', { type: 'text', content: 'Smoke status update! 🔥', privacy: 'contacts' });
  check('create text status', r.status === 201 && r.json.status, r, 'message');
  const sid = r.json.status?._id || r.json.status?.id;

  r = await api.req('GET', '/api/status');
  check('get status feed', r.status === 200 && r.json.success, r, 'message');

  r = await api.req('POST', '/api/status', { type: 'text', content: 'Private one', privacy: 'only_me' });
  check('create private status', r.status === 201, r, 'message');

  r = await api.req('GET', `/api/status/${sid}/viewers`);
  check('get status viewers', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/status-advanced/qr', { statusId: sid });
  check('status QR code', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/status-advanced/draft', { type: 'text', text: 'Draft status' });
  check('save status draft', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('GET', '/api/status-advanced/templates');
  check('status templates', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/status/${sid}/react`, { emoji: '👍' });
  check('react to status', r.status === 200, r, 'message');

  // ── F. PRIVACY & SECURITY ──────────────────────────────────────────
  console.log('\n[F] PRIVACY & SECURITY');
  r = await api.req('PUT', '/api/settings', { privacy: { lastSeen: 'contacts', profilePhoto: 'contacts', status: 'contacts', groups: 'everyone' } });
  check('update settings (privacy)', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/settings');
  check('get settings', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/chat/users/${ids[2]}/block`, {});
  check('block user', r.status === 200, r, 'message');
  r = await api.req('DELETE', `/api/chat/users/${ids[2]}/block`, {});
  check('unblock user', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/chat/users/${ids[2]}/report`, { reason: 'harassment', description: 'smoke test' });
  check('report user', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'View once!', viewOnce: true });
  check('send view-once message', r.status === 201, r, 'message');

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'Will vanish', disappearAfterSeconds: 60 });
  check('send disappearing message', r.status === 201, r, 'message');

  r = await api.req('POST', '/api/scheduled-messages', { conversationId: conv, content: 'Later message', sendAt: new Date(Date.now() + 3600000).toISOString() });
  check('schedule message', r.status === 201 || r.status === 200, r, 'message');
  r = await api.req('GET', '/api/scheduled-messages');
  check('list scheduled messages', r.status === 200 && Array.isArray(r.json.scheduledMessages), r, 'message');

  r = await api.req('GET', '/api/backup/list');
  check('list backups', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/security/2fa/setup', {});
  check('2FA setup (TOTP QR)', r.status === 200 && (r.json.qrCode || r.json.otpauthUrl || r.json.qr), r, 'message');

  r = await api.req('POST', '/api/notifications/subscribe', { subscription: { endpoint: 'https://example.com/push', keys: { p256dh: 'abc', auth: 'def' } } });
  check('notification subscribe', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('GET', '/api/notifications/subscriptions');
  check('list subscriptions', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/theme-engine/mode', { mode: 'dark' });
  check('apply theme mode (dark)', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/theme-engine/settings');
  check('get theme settings', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/chat-folders/create', { name: 'Work', conversationIds: [conv] });
  check('create chat folder', r.status === 201 || r.status === 200, r, 'message');
  r = await api.req('GET', '/api/chat-folders');
  check('list chat folders', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/message-translator/translate', { text: 'Hello friend', targetLanguage: 'sw' });
  check('translate message', r.status === 200 || r.status === 201, r, 'message');


  // ── G. MODS & ADVANCED ─────────────────────────────────────────────
  console.log('\n[G] MODS & ADVANCED');
  r = await api.req('POST', '/api/bulk-sender/send', { recipients: [ids[1]], content: 'Bulk hello' });
  check('bulk sender', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('POST', '/api/chat-analyzer/analyze', { conversationId: conv });
  check('chat analyzer', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/location-sharing/live/start', { conversationId: conv });
  check('live location start', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('POST', '/api/location-sharing/share', { conversationId: conv, latitude: -6.79, longitude: 39.2 });
  check('share location', r.status === 200 || r.status === 201, r, 'message');

  r = await api.upload('/api/voice/upload', 'file', 'note.mp3', 'audio/mpeg', Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  check('voice note upload', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('GET', '/api/voice');
  check('list voice notes', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/data-usage/stats');
  check('data usage stats', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/storage-manager/usage');
  check('storage manager usage', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/cache-cleaner/size');
  check('cache cleaner size', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/anti-revoke/settings');
  check('anti-revoke settings', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/story-highlights');
  check('story highlights', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/fake-chat/toggle', { chatEnabled: true });
  r = await api.req('POST', '/api/fake-chat/create', { contactName: 'Fake Friend', messages: [{ text: 'fake msg', from: 'me' }] });
  check('fake chat generator', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('GET', '/api/gif-player/saved');
  check('gif player saved', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/text-repeater/repeat', { text: 'Repeat me', count: 2, intervalMs: 5000, conversationId: conv });
  check('text repeater', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('GET', '/api/genz-mods/settings');
  check('genz mods settings', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/quick-actions/create-poll', { conversationId: conv, question: 'Best movie?', options: ['A', 'B'] });
  check('quick actions (create poll)', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('GET', '/api/chat-sort/settings');
  check('chat sort settings', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/chat-filter/filter', { filter: 'unread' });
  check('chat filter', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('GET', '/api/chat-search/history');
  check('chat search history', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/communities');
  check('communities', r.status === 200, r, 'message');

  // ── H. MODS ROUND 2 ────────────────────────────────────────────────
  console.log('\n[H] MODS ROUND 2');
  r = await api.req('GET', '/api/stickers/packs');
  check('sticker packs', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/stickers/me');
  check('my stickers', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/channels', { name: 'Smoke Channel', description: 'test channel' });
  check('create channel', r.status === 201 || r.status === 200, r, 'message');
  const chid = r.json.channel?._id || r.json.channel?.id || r.json.id;
  r = await api.req('GET', '/api/channels');
  check('list channels', r.status === 200, r, 'message');
  if (chid) {
    r = await api.req('POST', `/api/channels/${chid}/follow`, {});
    check('follow channel', r.status === 200, r, 'message');
    r = await api.req('POST', `/api/channels/${chid}/posts`, { content: 'Channel post!' });
    check('create channel post', r.status === 201 || r.status === 200, r, 'message');
    const postId = r.json.post?._id || r.json.post?.id || r.json.id;
    if (postId) {
      r = await api.req('POST', `/api/channels/${chid}/posts/${postId}/react`, { emoji: '👍' });
      check('react to channel post', r.status === 200, r, 'message');
      r = await api.req('POST', `/api/channels/${chid}/posts/${postId}/view`, {});
      check('mark channel post viewed', r.status === 200, r, 'message');
    }
    r = await api.req('DELETE', `/api/channels/${chid}/follow`, {});
    check('unfollow channel', r.status === 200, r, 'message');
  }

  r = await api.req('POST', '/api/contacts/sync', { contacts: [{ name: 'Jane Doe', phoneNumber: '+255712345678' }] });
  check('sync contacts', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/contacts/matched');
  check('matched contacts', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/contacts/suggestions');
  check('contact suggestions', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/privacy/excluded', { contactId: ids[1], privacyType: 'last_seen', contactName: 'User B', contactPhone: users[1].phoneNumber });
  check('privacy exclude contact', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/privacy/excluded/last_seen');
  check('list excluded contacts', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/communities', { name: 'GenZ Hub' });
  check('create community', r.status === 201 || r.status === 200, r, 'message');
  const comid = r.json.community?._id || r.json.community?.id || r.json.id;
  if (comid) {
    r = await api.req('POST', `/api/communities/${comid}/join`, {});
    check('join community', r.status === 200, r, 'message');
    r = await api.req('POST', `/api/communities/${comid}/leave`, {});
    check('leave community', r.status === 200, r, 'message');
  }

  r = await api.req('POST', '/api/business-account/enable', { businessName: 'Smoke Biz', businessCategory: 'Retail' });
  check('enable business account', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/business-account/settings');
  check('business account settings', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/media-editor/settings');
  check('media editor settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/media-compressor/settings');
  check('media compressor settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/media-compressor/stats');
  check('compressor stats', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/live-reactions/message/${msg1}`, { emoji: '😂', conversationId: conv });
  check('live reaction', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('GET', '/api/group-mods/settings');
  check('group mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/message-mods/settings');
  check('message mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/security-mods/settings');
  check('security mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/automation-mods/settings');
  check('automation mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/chat-list-mods/settings');
  check('chat list mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/customization-mods/settings');
  check('customization mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/media-mods/settings');
  check('media mods settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/privacy-mods/settings');
  check('privacy mods settings', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/story-highlights/create', { title: 'Highlights', statusIds: [] });
  check('create story highlight', r.status === 201 || r.status === 200, r, 'message');
  r = await api.req('GET', '/api/story-highlights');
  check('list story highlights', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/multi-accounts/settings');
  check('multi-accounts settings', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/payment-features');
  check('payment features list (public)', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/encryption/keys/status');
  check('encryption key status', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/notifications/vapid-public-key');
  check('vapid public key', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/anti-ban/settings');
  check('anti-ban settings', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/whatsapp-web/settings');
  check('whatsapp-web settings', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/advanced/dashboard/stats');
  check('advanced dashboard stats', r.status === 200, r, 'message');

  r = await api.req('POST', '/api/gif-player/settings', { saveGIFs: true });
  r = await api.req('POST', '/api/gif-player/save', { gifUrl: 'https://media.giphy.com/media/xT9DPBq7aQb9iP9O1O/giphy.gif', name: 'Test gif' });
  check('save GIF', r.status === 200 || r.status === 201, r, 'message');

  // ── SUMMARY ────────────────────────────────────────────────────────
  console.log(`\n=== SUMMARY: ${results.pass.length} passed, ${results.fail.length} failed ===`);
  if (results.fail.length) {
    console.log('\nFAILED:');
    results.fail.forEach(f => console.log('  ❌ ' + f));
  }
  process.exit(results.fail.length ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(2); });
