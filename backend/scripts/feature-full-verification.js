/**
 * FEATURE FULL VERIFICATION
 * -------------------------
 * Deep verification of the user-facing feature set against a LIVE backend:
 *   [S] STATUS  — create/edit/view/react/poll/privacy/highlights/drafts/... (full status feature set)
 *   [C] CHAT    — message/reply/edit/delete/reactions/star/lock/keep/forward/view-once/...
 *   [G] GROUP   — member vs admin roles, join-approval flow, ban/unban, transfer ownership
 *   [T] SETTINGS — every settings category (account/privacy/chats/notifications/storage/app/help)
 *   [AD] ADMIN  — bootstrap test owner, 2FA login, dashboard, user/device/permission/broadcast/content control
 *
 * Run:  node scripts/feature-full-verification.js
 * Requires: backend on :5000 (SMOKE_BASE_URL to override), MongoDB up.
 * Note: creates throwaway test users + one test admin owner (TEST_VERIFY_*) — never touches PRIMARY_OWNER.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const ADMIN_BASE = '/api/admin';                       // admin API endpoints
const ADMIN_AUTH_BASE = '/api/system-gateway-x9k/auth'; // obscured login path

const results = { pass: [], fail: [], info: [] };
let cookie = '';
let token = '';
let adminToken = '';

const api = {
  async req(method, path, body, extraHeaders = {}) {
    const opts = { method, headers: {} };
    if (cookie) opts.headers.Cookie = cookie;
    // admin endpoints MUST use the admin token (never the regular user token)
    if (adminToken && path.startsWith(ADMIN_BASE)) {
      opts.headers.Authorization = `Bearer ${adminToken}`;
    } else if (token) {
      opts.headers.Authorization = `Bearer ${token}`;
    }
    for (const [k, v] of Object.entries(extraHeaders)) opts.headers[k] = v;
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
  async upload(path, field, filename, mime, buffer) {
    const fd = new FormData();
    fd.append(field, new Blob([buffer], { type: mime }), filename);
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {})
      },
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
function info(name, msg = '') {
  results.info.push(name);
  console.log(`  ℹ️  ${name}${msg ? ' — ' + msg : ''}`);
}
const pick = (o, keys) => { if (!o) return undefined; for (const k of keys) { if (o[k]) return o[k]; } return undefined; };
const idOf = (obj) => (obj && (obj._id || obj.id)) || undefined;

function feedHasStatus(json, sid) {
  if (!json) return false;
  const hay = JSON.stringify(json);
  return hay.includes(sid);
}

async function main() {
  console.log(`\n=== FEATURE FULL VERIFICATION (${BASE}) ===\n`);
  const suffix = Date.now().toString().slice(-8);
  const users = [
    { username: `fv_a_${suffix}`, phoneNumber: `+2558${suffix}001`, password: 'TestPass!123' },
    { username: `fv_b_${suffix}`, phoneNumber: `+2558${suffix}002`, password: 'TestPass!123' },
    { username: `fv_c_${suffix}`, phoneNumber: `+2558${suffix}003`, password: 'TestPass!123' },
    { username: `fv_d_${suffix}`, phoneNumber: `+2558${suffix}004`, password: 'TestPass!123' },
  ];
  const ids = {};

  const register = async (u) => api.req('POST', '/api/auth/register', u);
  const loginAs = async (idx) => {
    const r = await api.req('POST', '/api/auth/login', { identifier: users[idx].username, password: users[idx].password });
    cookie = r.setCookie; token = r.json.token; return r;
  };
  const asUser = async (idx, fn) => { await loginAs(idx); return fn(); };

  // ── SETUP USERS ─────────────────────────────────────────────────────
  console.log('[SETUP] Registering 4 test users');
  for (let i = 0; i < 4; i++) {
    const r = await register(users[i]);
    check(`register user${i + 1}`, r.status === 201 && r.json.success, r, 'message');
    ids[i] = r.json.user?._id || r.json.user?.id;
  }
  console.log(`     ids: ${JSON.stringify(ids)}\n`);

  // ═══════════════════════════════════════════════════════════════════
  // [S] STATUS — FULL FEATURE SET
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[S] STATUS (full feature set)');
  await loginAs(0);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'
  );

  let r = await api.req('POST', '/api/status', { type: 'text', textStatus: { text: 'FV text status 🔥' }, privacy: 'contacts' });
  check('S1 create text status', r.status === 201 && r.json.status, r, 'message');
  const sid = idOf(r.json.status);

  r = await api.req('POST', '/api/status', { type: 'text', textStatus: { text: 'FV only_me' }, privacy: 'only_me' });
  check('S2 create only_me status', r.status === 201, r, 'message');
  const sidPrivate = idOf(r.json.status);

  r = await api.req('POST', '/api/status', { type: 'text', textStatus: { text: 'FV contacts_except' }, privacy: 'contacts_except' });
  check('S3 create contacts_except status', r.status === 201, r, 'message');
  const sidExcl = idOf(r.json.status);

  r = await api.upload('/api/status/upload', 'file', 'fv-status.png', 'image/png', png);
  check('S4 upload status media', r.status === 200 || r.status === 201, r, 'message');
  const mediaUrl = pick(r.json, ['fileUrl', 'url', 'mediaUrl']);
  if (mediaUrl) {
    r = await api.req('POST', '/api/status', { type: 'image', content: mediaUrl, privacy: 'contacts' });
    check('S5 create media status', r.status === 201 && r.json.status, r, 'message');
  } else info('S5 create media status', 'no mediaUrl returned from upload');

  if (sid) {
    r = await api.req('POST', `/api/status/${sid}/poll`, { question: 'Best pizza?', options: ['A', 'B'], allowMultiple: false });
    check('S6 create status poll', r.status === 200 || r.status === 201, r, 'message');
    const poll = pick(r.json, ['poll', 'status', 'data']);
    const pollId = pick(poll || {}, ['_id', 'id', 'pollId']);
    if (pollId) {
      const optIds = (poll.options || []).map((o) => o._id || o.id);
      if (optIds.length) {
        r = await api.req('POST', `/api/status/${sid}/poll/vote`, { optionIds: [optIds[0]] });
        check('S7 vote on status poll', r.status === 200, r, 'message');
      }
    }

    r = await api.req('POST', `/api/status/${sid}/favorite`, {});
    check('S8 favorite (save) status', r.status === 200, r, 'message');
    r = await api.req('GET', '/api/status/saved');
    check('S9 list saved statuses', r.status === 200, r, 'message');

    r = await api.req('POST', `/api/status/archive/${sid}`, { isArchived: true });
    check('S10 archive status', r.status === 200, r, 'message');
    r = await api.req('GET', '/api/status/archive');
    check('S11 list archived statuses', r.status === 200, r, 'message');
    r = await api.req('POST', `/api/status/unarchive/${sid}`, {});
    check('S12 unarchive status', r.status === 200, r, 'message');

    r = await api.req('POST', '/api/status/schedule', { scheduledAt: new Date(Date.now() + 86400000).toISOString(), type: 'text', textStatus: { text: 'Scheduled FV' } });
    check('S13 schedule status', r.status === 200 || r.status === 201, r, 'message');
    r = await api.req('GET', '/api/status/scheduled');
    check('S14 list scheduled statuses', r.status === 200, r, 'message');

    r = await api.req('POST', `/api/status/${sid}/share-token`, {});
    check('S15 create share token', r.status === 200 || r.status === 201, r, 'message');

    r = await api.req('GET', '/api/status/analytics/' + sid);
    check('S16 get status analytics', r.status === 200, r, 'message');

    r = await api.req('POST', `/api/status/link-preview`, { url: 'https://example.com' });
    check('S17 link preview', r.status === 200 || r.status === 201, r, 'message');
    r = await api.req('POST', '/api/status/call-link', {});
    check('S18 create call link', r.status === 200 || r.status === 201, r, 'message');

    r = await api.req('POST', `/api/status/${sid}/screenshot-attempt`, {});
    check('S19 screenshot attempt report', r.status === 200, r, 'message');

    r = await api.req('POST', `/api/status/${sid}/reply`, { content: 'Nice status!' });
    check('S20 reply to status', r.status === 200 || r.status === 201, r, 'message');

    r = await api.req('POST', `/api/status/${sid}/forward`, { targetUserIds: [ids[1]] });
    check('S21 forward status', r.status === 200 || r.status === 201, r, 'message');

    r = await api.req('GET', '/api/status/revoked');
    check('S22 get revoked statuses', r.status === 200, r, 'message');
    r = await api.req('GET', '/api/status/search?q=FV');
    check('S23 search statuses', r.status === 200, r, 'message');

    r = await api.req('GET', '/api/status/history');
    check('S24 status history', r.status === 200, r, 'message');

    r = await api.req('PUT', '/api/status/privacy', { privacy: 'contacts' });
    check('S25 update status privacy', r.status === 200, r, 'message');
    r = await api.req('GET', '/api/status/privacy');
    check('S26 get status privacy', r.status === 200, r, 'message');

    r = await api.req('GET', `/api/status/${sid}/qr`);
    check('S27 status QR code', r.status === 200 && (r.json.qrData || r.json.qrCode || r.json.qr || r.json.dataUrl || r.json.qrCodeUrl), r, 'message');
    r = await api.req('GET', '/api/status/feed');
    check('S28 get status feed', r.status === 200, r, 'message');
    r = await api.req('GET', '/api/status/my-status');
    check('S29 my status', r.status === 200, r, 'message');
  }

  // viewer flow: u1 views + reacts (using contacts status from S1)
  await asUser(1, async () => {
    if (sid) {
      r = await api.req('POST', `/api/status/${sid}/view`, {});
      check('S30 view status (u1)', r.status === 200, r, 'message');
      r = await api.req('POST', `/api/status/${sid}/react`, { emoji: '👍' });
      check('S31 react to status (u1)', r.status === 200, r, 'message');
      r = await api.req('GET', `/api/status/${sid}/reactions`);
      check('S32 get status reactions', r.status === 200, r, 'message');
    }
    r = await api.req('POST', `/api/status/${sid}/mute`, {});
    check('S33 mute user status (u1)', r.status === 200, r, 'message');
    // privacy: u1 should NOT see u0's only_me or contacts_except statuses
  r = await api.req('GET', '/api/status');
  check('S31 u1 status feed (success)', r.status === 200 && r.json.success, r, 'message');
  if (r.status === 200 && r.json.success) {
    const seesPrivate = feedHasStatus(r.json, sidPrivate);
    const seesExcl = feedHasStatus(r.json, sidExcl);
    check('S34 only_me NOT visible to u1', !seesPrivate, r, 'message');
    check('S35 contacts_except NOT visible to u1', !seesExcl, r, 'message');
  }
  });

  await loginAs(0);
  r = await api.req('GET', `/api/status/viewers/${sid}`);
  check('S36 get status viewers (owner)', r.status === 200, r, 'message');

  // status advanced: drafts/templates/backup/history
  r = await api.req('POST', '/api/status/drafts', { type: 'text', textStatus: { text: 'FV draft' } });
  check('S37 save status draft', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('GET', '/api/status/drafts');
  check('S38 list drafts', r.status === 200, r, 'message');
  const draftId = pick(r.json, ['drafts', 'data']) && Array.isArray(pick(r.json, ['drafts', 'data'])) ? pick(r.json, ['drafts', 'data'])[0]?._id : undefined;
  if (draftId) { r = await api.req('DELETE', `/api/status/drafts/${draftId}`, {}); check('S39 delete draft', r.status === 200, r, 'message'); }

  r = await api.req('GET', '/api/status/history');
  check('S40 status history', r.status === 200, r, 'message');

  r = await api.req('GET', '/api/status/saved');
  check('S41 get saved statuses', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/status/history');
  check('S42 status history (dup)', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/status/revoked');
  check('S44 get revoked statuses', r.status === 200, r, 'message');

  // status privacy + mute + schedule + link-preview
  r = await api.req('PUT', '/api/status/privacy', { privacy: 'contacts' });
  check('S45 update status privacy', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/status/privacy');
  check('S46 get status privacy', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/status/scheduled');
  check('S47 get scheduled statuses', r.status === 200, r, 'message');
  r = await api.req('POST', '/api/status/link-preview', { url: 'https://example.com' });
  check('S48 get link preview', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('POST', '/api/status/call-link', {});
  check('S49 create call link', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('POST', `/api/status/${sid}/share-token`, {});
  check('S50 create share token', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('GET', '/api/status/feed');
  check('S51 get status feed', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/story-highlights');
  check('S52 list story highlights', r.status === 200, r, 'message');
  r = await api.req('POST', `/api/status/${sid}/forward`, { contacts: [], groups: [] });
  check('S53 forward status (graceful)', r.status === 400 || r.status === 200 || r.status === 201, r, 'message');

  // delete statuses
  r = await api.req('DELETE', `/api/status/${sidPrivate}`, {});
  check('S57 delete only_me status', r.status === 200, r, 'message');
  r = await api.req('DELETE', `/api/status/${sidExcl}`, {});
  check('S58 delete contacts_except status', r.status === 200, r, 'message');

  // ═══════════════════════════════════════════════════════════════════
  // [C] CHAT — FULL FEATURE SET
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[C] CHAT (full feature set)');
  r = await api.req('POST', '/api/chat/conversation', { userId: ids[1] });
  check('C1 get-or-create 1:1 conversation', r.status === 200 && r.json.conversation, r, 'message');
  const conv = idOf(r.json.conversation);

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'FV hello u2!' });
  check('C2 send text message', r.status === 201 && r.json.message, r, 'message');
  const m1 = idOf(r.json.message);

  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'FV reply', replyTo: m1 });
  check('C3 reply to message', r.status === 201, r, 'message');
  const m2 = idOf(r.json.message);

  r = await api.req('PUT', `/api/chat/messages/${m2}`, { content: 'FV reply edited' });
  check('C4 edit message', r.status === 200, r, 'message');

  r = await api.req('GET', `/api/chat/messages/${m2}/edit-history`);
  check('C5 message edit history', r.status === 200, r, 'message');

  r = await api.req('GET', `/api/chat/messages/${m2}/info`);
  check('C6 message info', r.status === 200, r, 'message');

  await loginAs(1);
  r = await api.req('POST', `/api/chat/messages/${m1}/reactions`, { emoji: '🔥' });
  check('C7 react to message (u1)', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('DELETE', `/api/chat/messages/${m1}/reactions`, {});
  check('C8 remove reaction (u1)', r.status === 200, r, 'message');

  r = await api.req('POST', `/api/chat/messages/${m1}/forward`, { targetConversationIds: [conv] });
  check('C9 forward message', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('POST', `/api/chat/messages/${m1}/report`, { reason: 'spam', details: 'FV verification report' });
  check('C10 report message (u1)', r.status === 200 || r.status === 201, r, 'message');

  r = await api.req('PUT', `/api/chat/messages/${m1}/read`, {});
  check('C11 mark as read (u1)', r.status === 200, r, 'message');

  r = await api.req('GET', `/api/chat/conversations/${conv}/search?query=FV`);
  check('C12 search messages', r.status === 200 && Array.isArray(r.json.messages), r, 'message');

  await loginAs(0);
  r = await api.req('PUT', `/api/chat/messages/${m1}/star`, {});
  check('C13 star message', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/messages/${m1}/star`, {});
  check('C14 unstar message', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/chat/messages/starred');
  check('C15 starred messages list', r.status === 200, r, 'message');

  r = await api.req('PUT', `/api/chat/messages/${m1}/lock`, {});
  check('C16 lock message', r.status === 200, r, 'message');
  // keep-in-chat only applies to disappearing messages (verified at C25)

  // media message
  r = await api.upload('/api/media/upload/image', 'image', 'fv.png', 'image/png', png);
  check('C18 upload image', r.status === 200 || r.status === 201, r, 'message');
  const mUrl = pick(r.json, ['fileUrl', 'url']);
  if (mUrl) {
    r = await api.req('POST', '/api/chat/messages', { conversationId: conv, mediaUrl: mUrl, mediaType: 'image', caption: 'FV image' });
    check('C19 send media message', r.status === 201 && r.json.message, r, 'message');
    const mMedia = idOf(r.json.message);
    r = await api.req('GET', `/api/chat/conversations/${conv}/media`);
    check('C20 media gallery', r.status === 200 && Array.isArray(r.json.media), r, 'message');
  }

  // view-once + disappearing (allowScreenshot: false → anti-screenshot active)
  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'FV view once', isViewOnce: true, allowScreenshot: false });
  check('C22 send view-once message', r.status === 201, r, 'message');
  const mVo = idOf(r.json.message);
  // view-once reveal is done by the RECEIVER — do it after switching to u1 below
  // enable disappearing on the conversation first (conversation-level setting)
  r = await api.req('PUT', `/api/advanced/conversations/${conv}/disappearing-messages`, { enabled: true, timer: 24 });
  check('C24 enable disappearing messages', r.status === 200, r, 'message');
  r = await api.req('POST', '/api/chat/messages', { conversationId: conv, content: 'FV vanish' });
  check('C24b send message in disappearing chat', r.status === 201, r, 'message');
  const mDisappear = idOf(r.json.message);
  // disable again so the rest of the conversation is not affected
  r = await api.req('PUT', `/api/advanced/conversations/${conv}/disappearing-messages`, { enabled: false });
  check('C24c disable disappearing messages', r.status === 200, r, 'message');

  // keep only applies to disappearing messages; screenshot attempt on view-once is by the receiver
  if (mDisappear) {
    r = await api.req('PUT', `/api/chat/messages/${mDisappear}/keep`, {});
    check('C25 keep disappearing message', r.status === 200, r, 'message');
  }

  // view-once reveal + screenshot attempt are done by the RECEIVER (u1)
  await loginAs(1);
  if (mVo) {
    r = await api.req('POST', `/api/chat/messages/${mVo}/view-once-reveal`, {});
    check('C23b reveal view-once (receiver)', r.status === 200 || r.status === 201, r, 'message');
    r = await api.req('POST', `/api/chat/messages/${mVo}/screenshot-attempt`, {});
    check('C23c screenshot attempt report (receiver)', r.status === 200 || r.status === 201, r, 'message');
  }
  await loginAs(0);

  // conversation management
  r = await api.req('PUT', `/api/chat/conversations/${conv}/pin`, {});
  check('C26 pin conversation', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/conversations/${conv}/pin`, {});
  check('C27 unpin conversation', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/conversations/${conv}/archive`, {});
  check('C28 archive conversation', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/conversations/${conv}/archive`, {});
  check('C29 unarchive conversation', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/chat/conversations');
  check('C30 list conversations', r.status === 200 && Array.isArray(r.json.conversations), r, 'message');
  r = await api.req('GET', `/api/chat/conversations/${conv}/messages`);
  check('C31 get messages', r.status === 200 && Array.isArray(r.json.messages), r, 'message');

  // delete for me + delete for everyone (unlock locked message first)
  r = await api.req('DELETE', `/api/chat/messages/${m2}`, {});
  check('C32 delete for me', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/messages/${m1}/lock`, {});
  r = await api.req('DELETE', `/api/chat/messages/${m1}/delete-for-everyone`, {});
  check('C33 delete for everyone', r.status === 200, r, 'message');

  // ═══════════════════════════════════════════════════════════════════
  // [G] GROUP — MEMBER vs ADMIN ROLES + JOIN APPROVAL
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[G] GROUP (member vs admin roles)');
  r = await api.req('POST', '/api/chat/groups', { name: `FV Group ${suffix}`, participants: [ids[1]] });
  check('G1 create group (u0 owner)', r.status === 201 && (r.json.group || r.json.conversation), r, 'message');
  const gid = idOf(r.json.group) || idOf(r.json.conversation);

  r = await api.req('POST', `/api/chat/groups/${gid}/participants`, { userId: ids[2] });
  check('G2 add participant (u0)', r.status === 200 || r.status === 201, r, 'message');

  // member (u1) must NOT be able to do admin ops
  await loginAs(1);
  r = await api.req('PUT', `/api/chat/groups/${gid}/admins/${ids[2]}`, {});
  check('G3 member cannot promote admin (403)', r.status === 403, r, 'message');
  r = await api.req('DELETE', `/api/chat/groups/${gid}/participants/${ids[2]}`, {});
  check('G4 member cannot remove participant (403)', r.status === 403, r, 'message');
  // canChangeGroupInfo defaults to true (WhatsApp-like) → members CAN edit the
  // name, but they must NEVER be able to change the group permission toggles.
  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { groupName: 'HACKED' });
  check('G5 member CAN edit name when open (200)', r.status === 200, r, 'message');
  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { canChangeGroupInfo: false });
  check('G5b member cannot change permission toggle (403)', r.status === 403, r, 'message');
  r = await api.req('POST', `/api/chat/groups/${gid}/ban/${ids[2]}`, {});
  check('G6 member cannot ban (403)', r.status === 403, r, 'message');
  r = await api.req('PUT', `/api/chat/groups/${gid}/transfer-ownership`, { newOwnerId: ids[1] });
  check('G7 member cannot transfer ownership (403)', r.status === 403, r, 'message');

  // u1 CAN chat as a normal member
  r = await api.req('POST', '/api/chat/messages', { conversationId: gid, content: 'FV member message from u1' });
  check('G8 member can send group message', r.status === 201, r, 'message');
  r = await api.req('GET', `/api/chat/groups/${gid}/info`);
  check('G9 member can view group info', r.status === 200, r, 'message');

  // u0 promotes u2 → u2 gets admin powers
  await loginAs(0);
  r = await api.req('PUT', `/api/chat/groups/${gid}/admins/${ids[2]}`, {});
  check('G10 promote u2 to admin', r.status === 200, r, 'message');
  // lock group info to admins only, then member edit must fail
  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { canChangeGroupInfo: false });
  check('G10b admin locks group info', r.status === 200, r, 'message');
  await loginAs(1);
  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { groupName: 'STILL-HACKED' });
  check('G10c member cannot edit locked info (403)', r.status === 403, r, 'message');
  await loginAs(0);
  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { canChangeGroupInfo: true });
  check('G10d admin re-opens group info', r.status === 200, r, 'message');

  await loginAs(2);
  r = await api.req('PUT', `/api/chat/groups/${gid}/info`, { description: 'updated by u2 (admin)' });
  check('G11 admin can edit group info', r.status === 200, r, 'message');
  r = await api.req('POST', `/api/chat/groups/${gid}/participants`, { userId: ids[3] });
  check('G12 admin can add participant', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('DELETE', `/api/chat/groups/${gid}/participants/${ids[3]}`, {});
  check('G13 admin can remove participant', r.status === 200, r, 'message');
  r = await api.req('POST', `/api/chat/groups/${gid}/ban/${ids[1]}`, {});
  check('G14 admin can ban member', r.status === 200, r, 'message');
  r = await api.req('DELETE', `/api/chat/groups/${gid}/ban/${ids[1]}`, {});
  check('G15 admin can unban member', r.status === 200, r, 'message');

  // join-approval flow: u0 enables, u3 requests via invite, u0 approves
  await loginAs(0);
  r = await api.req('PUT', `/api/chat/groups/${gid}/join-approval`, { requireApproval: true });
  check('G16 enable join approval', r.status === 200 && r.json.requireJoinApproval === true, r, 'message');
  r = await api.req('POST', `/api/chat/groups/${gid}/invite/regenerate`, {});
  const inviteCode = r.json.inviteCode || r.json.invite?.code || r.json.code;
  check('G16b regenerate invite link', r.status === 200 && !!inviteCode, r, 'message');

  await loginAs(3);
  r = await api.req('POST', `/api/chat/groups/${gid}/join`, { inviteCode });
  check('G17 join request (pending)', r.status === 200 || r.status === 201 || r.status === 202, r, 'message');

  await loginAs(0);
  r = await api.req('GET', `/api/chat/groups/${gid}/pending-requests`);
  check('G18 list pending requests', r.status === 200, r, 'message');
  const pending = Array.isArray(r.json.requests) ? r.json.requests : Array.isArray(r.json.pending) ? r.json.pending : [];
  const pendingU3 = pending.some((p) => {
    const s = JSON.stringify(p);
    return s.includes(String(ids[3]));
  });
  check('G19 u3 appears in pending', pendingU3, r, 'message');

  r = await api.req('POST', `/api/chat/groups/${gid}/pending-requests/${ids[3]}/approve`, {});
  check('G20 approve join request', r.status === 200, r, 'message');

  await loginAs(3);
  r = await api.req('DELETE', `/api/chat/groups/${gid}/leave`, {});
  check('G21 member leaves group', r.status === 200, r, 'message');

  // ownership transfer u0 → u2 → back
  await loginAs(0);
  r = await api.req('PUT', `/api/chat/groups/${gid}/transfer-ownership`, { newOwnerId: ids[2] });
  check('G22 transfer ownership to u2', r.status === 200, r, 'message');
  r = await api.req('GET', `/api/chat/groups/${gid}/info`);
  const ownerAfter = pick(r.json.group || r.json.groupInfo || r.json, ['owner', 'createdBy']);
  const ownerStr = String(ownerAfter?._id || ownerAfter || '');
  check('G23 owner is now u2', ownerStr === String(ids[2]) || ownerStr === String(ids[2]), r, 'message');

  await loginAs(2);
  r = await api.req('PUT', `/api/chat/groups/${gid}/transfer-ownership`, { newOwnerId: ids[0] });
  check('G24 transfer ownership back to u0', r.status === 200, r, 'message');

  // antispam + events
  await loginAs(0);
  r = await api.req('PUT', `/api/chat/groups/${gid}/antispam`, { enabled: true, maxMessagesPerMinute: 10 });
  check('G25 update group antispam', r.status === 200, r, 'message');
  r = await api.req('GET', `/api/chat/groups/${gid}/qr`);
  check('G26 group QR', r.status === 200, r, 'message');
  r = await api.req('POST', `/api/chat/groups/${gid}/events`, { title: 'FV event', date: new Date(Date.now() + 86400000).toISOString() });
  check('G27 create group event', r.status === 201 || r.status === 200, r, 'message');
  const evt = pick(r.json.event || r.json, ['_id', 'id']);
  if (evt) {
    r = await api.req('POST', `/api/chat/groups/${gid}/events/${evt}/rsvp`, { status: 'going' });
    check('G28 rsvp to group event', r.status === 200, r, 'message');
  }
  r = await api.req('GET', `/api/chat/groups/${gid}/info`);
  const gnameAfter = pick(r.json.group || r.json.groupInfo || r.json, ['name', 'groupName']);
  check('G29 group info intact', r.status === 200 && gnameAfter, r, 'message');

  // ═══════════════════════════════════════════════════════════════════
  // [T] SETTINGS — ALL CATEGORIES
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[T] SETTINGS (all categories)');
  const fullSettings = {
    account: { twoStepVerification: true, securityNotifications: false, changeNumberGuard: true },
    privacy: {
      lastSeen: 'contacts', profilePhoto: 'nobody', about: 'contacts', status: 'only_share_with',
      readReceipts: false, defaultMessageTimer: '24h', groups: 'contacts',
      disableLinkPreviews: true,
      blockUnknownAccountMessages: true,
      appLock: { enabled: true, lockAfter: '15m', requireBiometric: false },
      chatLock: { enabled: true, secretCodeEnabled: true, hideLockedChats: false },
      trackProfileVisitors: true
    },
    chats: {
      theme: 'dark', wallpaper: '', wallpaperDimming: 20, chatColor: '#123456', fontSize: 'large',
      enterIsSend: true, mediaVisibility: false, keepChatsArchived: false, archiveMutedChats: false,
      backup: { enabled: true, frequency: 'daily', includeVideos: true, endToEndEncrypted: true },
      history: { exportFormat: 'json' }
    },
    notifications: {
      messages: false, groups: false, sounds: false, showPreview: false,
      highPriority: false, reactionNotifications: false, reminders: true,
      messageTone: 'chime', groupTone: 'bell', vibration: 'short'
    },
    storageData: {
      mobileAutoDownload: ['photos'], wifiAutoDownload: ['photos', 'documents'], roamingAutoDownload: [],
      photoUploadQuality: 'hd', videoUploadQuality: 'hd'
    },
    app: { language: 'sw', inviteFriends: false },
    help: { diagnostics: true, contactSupportAllowed: false }
  };

  r = await api.req('PUT', '/api/settings', fullSettings);
  check('T1 update all settings categories', r.status === 200 && r.json.success, r, 'message');
  r = await api.req('GET', '/api/settings');
  check('T2 get settings', r.status === 200 && r.json.success, r, 'message');
  const got = r.json.settings || r.json.user?.settings || {};
  const p = got.privacy || {};
  const ch = got.chats || {};
  const nt = got.notifications || {};
  const st = got.storageData || {};
  check('T3 privacy round-trip', p.lastSeen === 'contacts' && p.profilePhoto === 'nobody', r, 'message');
  check('T4 chats round-trip', ch.theme === 'dark' && ch.fontSize === 'large' && ch.chatColor === '#123456', r, 'message');
  check('T5 notifications round-trip', nt.messageTone === 'chime' && nt.messages === false, r, 'message');
  check('T6 storage round-trip', st.photoUploadQuality === 'hd', r, 'message');
  check('T7 app language round-trip', (got.app || {}).language === 'sw', r, 'message');

  // settings validation: invalid enum values are rejected with 400
  r = await api.req('PUT', '/api/settings', { privacy: { lastSeen: 'bogus-value' }, app: { language: 'nope' } });
  check('T8 invalid enum rejected (400)', r.status === 400 && r.json.success === false, r, 'message');

  // theme engine
  r = await api.req('POST', '/api/theme-engine/mode', { mode: 'light' });
  check('T9 theme mode light', r.status === 200, r, 'message');
  r = await api.req('GET', '/api/theme-engine/settings');
  check('T10 get theme settings', r.status === 200, r, 'message');
  r = await api.req('POST', '/api/theme-engine/mode', { mode: 'dark' });
  check('T11 theme mode dark', r.status === 200, r, 'message');

  // notifications subscribe
  r = await api.req('POST', '/api/notifications/subscribe', { subscription: { endpoint: 'https://example.com/fv-push', keys: { p256dh: 'abc', auth: 'def' } } });
  check('T14 subscribe push notifications', r.status === 200 || r.status === 201, r, 'message');
  r = await api.req('GET', '/api/notifications/subscriptions');
  check('T15 list push subscriptions', r.status === 200, r, 'message');

  // reset back to safe defaults-ish for privacy-critical toggles we turned on
  r = await api.req('PUT', '/api/settings', {
    privacy: { lastSeen: 'everyone', profilePhoto: 'everyone', about: 'everyone', status: 'contacts', readReceipts: true },
    chats: { theme: 'system', fontSize: 'medium' },
    app: { language: 'system' }
  });
  check('T16 restore safe settings', r.status === 200, r, 'message');

  // ═══════════════════════════════════════════════════════════════════
  // [AD] ADMIN SYSTEM — bootstrap test owner, 2FA login, full control
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[AD] ADMIN SYSTEM');
  // create a dedicated TEST admin owner (never touches PRIMARY_OWNER)
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const adminUsername = `fv_admin_${suffix}`;
  const adminPassword = 'FvAdminPass!2026x';
  let totpSecret = null;
  try {
    await mongoose.connect(mongoUri);
    const AdminOwner = require('../models/AdminOwner');
    let owner = await AdminOwner.findOne({ ownerKey: `TEST_VERIFY_${suffix}` });
    if (!owner) owner = new AdminOwner({ ownerKey: `TEST_VERIFY_${suffix}`, username: adminUsername });
    owner.username = adminUsername;
    await owner.setPassword(adminPassword);
    const secret = speakeasy.generateSecret({ name: `GENZ-Admin (${adminUsername})`, length: 20 });
    owner.totpSecret = secret.base32;
    owner.totpEnabled = true;
    owner.failedLoginAttempts = 0;
    owner.lockUntil = null;
    await owner.save();
    totpSecret = owner.totpSecret;
    await mongoose.disconnect();
    check('AD1 provision test admin owner (2FA on)', !!totpSecret);
  } catch (e) {
    console.error('    [admin prep failed]', e.message);
    check('AD1 provision test admin owner (2FA on)', false);
  }

  const totpCode = () => (totpSecret ? speakeasy.totp({ secret: totpSecret, encoding: 'base32' }) : '');

  // security: unauth access must fail
  adminToken = '';
  r = await api.req('GET', `${ADMIN_BASE}/overview`);
  check('AD2 admin API without token → 401', r.status === 401, r, 'message');

  r = await api.req('POST', `${ADMIN_AUTH_BASE}/login`, { username: adminUsername, password: 'WrongPass!999' });
  check('AD3 admin login wrong password → 401', r.status === 401, r, 'message');

  r = await api.req('POST', `${ADMIN_AUTH_BASE}/login`, { username: adminUsername, password: adminPassword });
  check('AD4 admin login step1 (2FA required)', r.status === 200 && r.json.requiresTwoFactor && r.json.preAuthToken, r, 'message');
  const preAuth = r.json.preAuthToken;

  r = await api.req('POST', `${ADMIN_AUTH_BASE}/verify-2fa`, { preAuthToken: preAuth, code: '000000' });
  check('AD5 wrong TOTP code → 401', r.status === 401, r, 'message');

  r = await api.req('POST', `${ADMIN_AUTH_BASE}/verify-2fa`, { preAuthToken: preAuth, code: totpCode() });
  check('AD6 admin login step2 valid TOTP', r.status === 200 && r.json.accessToken, r, 'message');
  adminToken = r.json.accessToken || '';

  // dashboard
  r = await api.req('GET', `${ADMIN_BASE}/overview`);
  check('AD7 admin overview', r.status === 200 && r.json.success !== false, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/health`);
  check('AD8 admin health', r.status === 200, r, 'message');

  // user management
  r = await api.req('GET', `${ADMIN_BASE}/users?page=1&limit=200`);
  check('AD9 list users', r.status === 200, r, 'message');
  const userList = Array.isArray(r.json.users) ? r.json.users : Array.isArray(r.json.data) ? r.json.data : [];
  const sawUsers = userList.some((u) => users.some((x) => u.username === x.username));
  check('AD10 test users visible in admin list', sawUsers, r, 'message');

  r = await api.req('PATCH', `${ADMIN_BASE}/users/${ids[2]}`, { premium: true });
  check('AD11 admin set premium', r.status === 200 && r.json.success, r, 'message');
  r = await api.req('PATCH', `${ADMIN_BASE}/users/${ids[2]}`, { premium: false });
  check('AD12 admin unset premium', r.status === 200, r, 'message');

  r = await api.req('POST', `${ADMIN_BASE}/users/${ids[2]}/block`, {});
  check('AD13 admin block user', r.status === 200 && r.json.success, r, 'message');
  r = await api.req('POST', `${ADMIN_BASE}/users/${ids[2]}/unblock`, {});
  check('AD14 admin unblock user', r.status === 200 && r.json.success, r, 'message');

  // permissions
  r = await api.req('GET', `${ADMIN_BASE}/permissions/options`);
  check('AD15 permission options', r.status === 200 && Array.isArray(r.json.permissions), r, 'message');
  const permKeys = (r.json.permissions || []).map((p) => p.key).slice(0, 2);
  if (permKeys.length) {
    r = await api.req('PATCH', `${ADMIN_BASE}/permissions/users/${ids[2]}`, { permissions: permKeys });
    check('AD16 set user permissions', r.status === 200 && r.json.success, r, 'message');
  }
  r = await api.req('GET', `${ADMIN_BASE}/permissions/users`);
  check('AD17 list users with permissions', r.status === 200, r, 'message');

  // devices + sessions
  r = await api.req('GET', `${ADMIN_BASE}/devices`);
  check('AD18 list devices', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/sessions/${ids[2]}`);
  check('AD19 list user sessions', r.status === 200, r, 'message');

  // broadcasts + notifications
  r = await api.req('GET', `${ADMIN_BASE}/broadcasts`);
  check('AD20 list broadcasts', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/notifications/overview`);
  check('AD21 notifications overview', r.status === 200, r, 'message');
  r = await api.req('POST', `${ADMIN_BASE}/broadcasts/announce`, { content: 'FV verification announcement', segment: 'all' });
  check('AD22 send system announcement', r.status === 200 && r.json.success, r, 'message');
  r = await api.req('POST', `${ADMIN_BASE}/notifications/send`, { title: 'FV', body: 'verification push', segment: 'all', url: '/' });
  check('AD23 send push notification', r.status === 200 && r.json.success, r, 'message');

  // content moderation: chats, groups, statuses (test data only)
  r = await api.req('GET', `${ADMIN_BASE}/chats`);
  check('AD24 list conversations', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/chats/${conv}/messages`);
  check('AD25 view conversation messages', r.status === 200, r, 'message');
  r = await api.req('DELETE', `${ADMIN_BASE}/chats/${conv}`, {});
  check('AD26 admin delete conversation', r.status === 200 && r.json.success, r, 'message');

  r = await api.req('GET', `${ADMIN_BASE}/groups`);
  check('AD27 list groups', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/groups/${gid}`);
  check('AD28 view group members', r.status === 200, r, 'message');
  r = await api.req('POST', `${ADMIN_BASE}/groups/${gid}/members/${ids[1]}/remove`, {});
  check('AD29 admin remove group member', r.status === 200 && r.json.success, r, 'message');
  r = await api.req('DELETE', `${ADMIN_BASE}/groups/${gid}`, {});
  check('AD30 admin delete group', r.status === 200 && r.json.success, r, 'message');

  r = await api.req('GET', `${ADMIN_BASE}/channels`);
  check('AD31 list channels', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/statuses`);
  check('AD32 list statuses', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/statuses/highlights`);
  check('AD33 list story highlights (admin)', r.status === 200, r, 'message');
  // (admin content deletion verified via chats + groups; status deletion via
  //  owner flow at S57/S58 — keeps the strict rate-limit budget within 10/hr)

  // insights / fraud / crashes / support
  r = await api.req('GET', `${ADMIN_BASE}/reports/growth`);
  check('AD35 growth report', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/reports/engagement`);
  check('AD36 engagement report', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/fraud/signals`);
  check('AD37 fraud signals', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/frontend-crashes`);
  check('AD38 frontend crash telemetry', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/tickets`);
  check('AD39 support tickets', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/direct-chats`);
  check('AD40 support direct chats', r.status === 200, r, 'message');

  // audit + security
  r = await api.req('GET', `${ADMIN_BASE}/audit-logs`);
  check('AD41 audit logs', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/security`);
  check('AD42 security report', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/abuse-reports`);
  check('AD43 abuse reports', r.status === 200, r, 'message');
  r = await api.req('GET', `${ADMIN_BASE}/abuse-reports/stats`);
  check('AD44 abuse report stats', r.status === 200, r, 'message');

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n=== SUMMARY: ${results.pass.length} passed, ${results.fail.length} failed, ${results.info.length} informational ===`);
  if (results.fail.length) {
    console.log('\nFAILED:');
    results.fail.forEach((f) => console.log('  ❌ ' + f));
  }
  if (results.info.length) {
    console.log('\nINFORMATIONAL (external API / shape):');
    results.info.forEach((f) => console.log('  ℹ️  ' + f));
  }
  process.exit(results.fail.length ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e.stack || e.message); process.exit(2); });
