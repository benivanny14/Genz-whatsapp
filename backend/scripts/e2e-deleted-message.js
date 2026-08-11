/**
 * GENZ WhatsApp e2e — anti-revoke deleted-messages flow through the SOCKET path.
 *
 * Exercises the exact path the frontend uses:
 *   1. Enable anti-revoke via POST /api/anti-revoke/settings
 *   2. Send a message via POST /api/chat/messages
 *   3. Delete for everyone via the socket event 'message:delete'
 *   4. View it in GET /api/genz-mods/deleted-messages (original text must survive)
 *   5. Restore via POST /api/genz-mods/restore-message/:id
 *   6. Confirm the chat now shows the restored text
 *
 * Safe to re-run: every run registers fresh timestamped users (no wiping).
 * Usage: node scripts/e2e-deleted-message.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { io } = require('socket.io-client');

const BASE = (process.argv[2] || process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

const SUFFIX = Date.now().toString(36);
const PASSWORD = 'GenzTest@2026!';
const USER_A = { username: `revoke_a_${SUFFIX}`, phoneNumber: `255733${String(Date.now()).slice(-6)}1`, password: PASSWORD };
const USER_B = { username: `revoke_b_${SUFFIX}`, phoneNumber: `255733${String(Date.now()).slice(-6)}2`, password: PASSWORD };

const results = [];
const pass = (name) => { results.push({ name, ok: true }); console.log(`  ✓ ${name}`); };
const fail = (name, err) => {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, error: msg });
  console.error(`  ✗ ${name}: ${msg}`);
};

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function registerOrLogin(user) {
  try {
    return await request('/auth/register', { method: 'POST', body: user });
  } catch (e) {
    if (e.status === 409 || /already|exists/i.test(e.message)) {
      return await request('/auth/login', {
        method: 'POST',
        body: { identifier: user.phoneNumber, password: user.password }
      });
    }
    throw e;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\nGENZ Deleted-Message socket e2e → ${BASE}\n`);

  let tokenA, userAId, tokenB, userBId, conversationId, messageId;

  try {
    const regA = await registerOrLogin(USER_A);
    tokenA = regA.token;
    userAId = regA.user?._id || regA.user?.id;
    pass('Register/login User A');
  } catch (e) { fail('Register/login User A', e); }

  try {
    const regB = await registerOrLogin(USER_B);
    tokenB = regB.token;
    userBId = regB.user?._id || regB.user?.id;
    pass('Register/login User B');
  } catch (e) { fail('Register/login User B', e); }

  if (!tokenA || !tokenB) { printSummary(); process.exit(1); }

  try {
    await request('/anti-revoke/settings', {
      method: 'POST',
      token: tokenA,
      body: { antiRevokeEnabled: true, cacheDeletedMessages: true, showDeletedMessages: true, cacheRetentionDays: 7 }
    });
    pass('Enable anti-revoke for User A');
  } catch (e) { fail('Enable anti-revoke', e); }

  try {
    const conv = await request('/chat/conversation', { method: 'POST', token: tokenA, body: { userId: userBId } });
    conversationId = conv.conversation?._id || conv.data?._id || conv._id;
    if (!conversationId) throw new Error('No conversation id returned');
    pass('Create 1:1 conversation A↔B');
  } catch (e) { fail('Create 1:1 conversation', e); }

  if (conversationId) {
    try {
      const sent = await request('/chat/messages', {
        method: 'POST',
        token: tokenA,
        body: { conversationId, content: 'Secret hello socket', messageType: 'text' }
      });
      messageId = sent.message?._id || sent.data?._id;
      if (!messageId) throw new Error('No message id returned');
      pass('Send message from User A');
    } catch (e) { fail('Send message', e); }
  }

  // ── Socket path: delete for everyone exactly like the frontend ──
  if (messageId) {
    const socket = io(BASE, {
      path: '/socket.io/',
      transports: ['websocket'],
      auth: { token: tokenA },
      reconnection: false,
      timeout: 5000
    });

    try {
      await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('socket connect timeout')), 6000);
      });
      socket.emit('user:join', String(userAId));
      await sleep(300);
      socket.emit('message:delete', { messageId: String(messageId), forEveryone: true });
      await sleep(1200); // let the server scrub + persist
      socket.close();
      pass('Socket message:delete (for everyone)');
    } catch (e) {
      socket.close();
      fail('Socket message:delete', e);
    }
  }

  // Viewer must show the ORIGINAL text (socket delete preserved originalContent).
  try {
    const viewed = await request('/genz-mods/deleted-messages', { token: tokenA });
    const hit = (viewed.messages || []).find((m) => String(m.id) === String(messageId));
    if (!hit) throw new Error('message not in deleted-messages viewer');
    if (hit.content !== 'Secret hello socket') throw new Error(`viewer content="${hit.content}"`);
    pass('Deleted-messages viewer shows original content');
  } catch (e) { fail('Deleted-messages viewer', e); }

  if (messageId) {
    try {
      await request(`/genz-mods/restore-message/${messageId}`, { method: 'POST', token: tokenA });
      pass('Restore deleted message');
    } catch (e) { fail('Restore deleted message', e); }

    try {
      const msgs = await request(`/chat/conversations/${conversationId}/messages`, { token: tokenA });
      const list = msgs.messages || msgs.data || [];
      const hit = list.find((m) => String(m._id || m.id) === String(messageId));
      if (!hit || hit.content !== 'Secret hello socket' || hit.deletedForEveryone === true) {
        throw new Error(`restored content="${hit?.content}" deletedForEveryone=${hit?.deletedForEveryone}`);
      }
      pass('Chat shows the restored message');
    } catch (e) { fail('Chat shows restored message', e); }
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${ok}/${total} passed`);
  if (ok < total) {
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  }
  console.log('');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
