/**
 * GENZ e2e — real-time delivery of GROUP messages + STATUS posts via sockets.
 *
 * Exercises the exact realtime paths the frontend uses:
 *   1. Register A (owner), B, C; create a group with A+B+C
 *   2. A and B connect real socket.io clients
 *   3. A posts a group message via REST → B's socket MUST receive
 *      `message:received` (group messages broadcast to the conversation room)
 *   4. A adds B to contacts and posts a status via REST → B's socket MUST
 *      receive `status:created` (statuses push to online contacts)
 *   5. Privacy sanity: a `contacts_except` status excluding B must NOT reach B
 *
 * Safe to re-run: fresh timestamped users per run (no wiping).
 * Usage: node scripts/e2e-group-status-live.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { io } = require('socket.io-client');

const BASE = (process.argv[2] || process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

const SUFFIX = Date.now().toString(36);
const PASSWORD = 'GenzTest@2026!';
const stamp = (n) => `255743${String(Date.now() + n).slice(-6)}`;
const USER_A = { username: `gsl_a_${SUFFIX}`, phoneNumber: stamp(1), password: PASSWORD };
const USER_B = { username: `gsl_b_${SUFFIX}`, phoneNumber: stamp(2), password: PASSWORD };
const USER_C = { username: `gsl_c_${SUFFIX}`, phoneNumber: stamp(3), password: PASSWORD };

const results = [];
const pass = (name) => { results.push({ name, ok: true }); console.log(`  ✓ ${name}`); };
const fail = (name, err) => {
  results.push({ name, ok: false, error: err?.message || String(err) });
  console.error(`  ✗ ${name}: ${err?.message || err}`);
};

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      transports: ['websocket'],
      auth: { token },
      reconnection: false,
      timeout: 15000
    });
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 15000);
    socket.on('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.on('connect_error', (e) => { clearTimeout(timer); reject(e); });
  });
}

const waitForEvent = (socket, event, { timeout = 20000, filter } = {}) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeout);
    const handler = (payload) => {
      if (filter && !filter(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

async function main() {
  const ts = Date.now();
  console.log(`\nGroup + Status live-delivery e2e (${new Date(ts).toISOString()})`);

  // 1. Register A, B, C
  const a = await request('/auth/register', { method: 'POST', body: USER_A });
  const b = await request('/auth/register', { method: 'POST', body: USER_B });
  const c = await request('/auth/register', { method: 'POST', body: USER_C });
  pass('register A + B + C');

  // 2. Create group (A owner, B + C members)
  const groupRes = await request('/chat/groups', {
    method: 'POST',
    token: a.token,
    body: { name: `Live Group ${SUFFIX}`, participants: [b.user._id, c.user._id] }
  });
  const group = groupRes.conversation || groupRes.group || groupRes;
  const groupId = String(group._id || group.id);
  if (!groupId) throw new Error('group not created');
  pass('create group (A owner, B+C members)');

  // 3. Connect A and B sockets and join their per-user rooms (user:join)
  const socketA = await connectSocket(a.token);
  const socketB = await connectSocket(b.token);
  socketA.emit('user:join', a.user._id);
  socketB.emit('user:join', b.user._id);
  pass('A + B socket.io connected');

  // 4. A sends a group message via REST → B receives message:received
  // (REST messages are delivered per-recipient via their user room)
  socketB.emit('join:conversation', groupId);
  const msgText = `Live group message ${ts}`;
  const msgPromise = waitForEvent(socketB, 'message:received', {
    filter: (m) => m && String(m.conversationId || m.conversation?._id) === groupId && (m.content || '') === msgText
  });
  await request('/chat/messages', {
    method: 'POST',
    token: a.token,
    body: { conversationId: groupId, content: msgText, messageType: 'text' }
  });
  const received = await msgPromise;
  if (received.content !== msgText) throw new Error('group message payload mismatch');
  pass('B receives group message live (message:received)');

  // 5. A adds B to contacts, then posts a status → B receives status:created
  await request('/chat/contacts', { method: 'POST', token: a.token, body: { userId: b.user._id } });
  const statusPromise = waitForEvent(socketB, 'status:created', {
    filter: (s) => s && String(s.user?._id || s.userId || s.user) === String(a.user._id) && (s.content || '') === `Live status ${ts}`
  });
  await request('/advanced/status', {
    method: 'POST',
    token: a.token,
    body: { type: 'text', content: `Live status ${ts}` }
  });
  const status = await statusPromise;
  if ((status.content || '') !== `Live status ${ts}`) throw new Error('status payload mismatch');
  pass('B receives A\'s new status live (status:created)');

  // 6. Privacy: contacts_except status excluding B must NOT reach B
  await request('/advanced/status', {
    method: 'POST',
    token: a.token,
    body: { type: 'text', content: `Hidden status ${ts}`, privacy: 'contacts_except', excludedContacts: [b.user._id] }
  });
  const leak = await Promise.race([
    waitForEvent(socketB, 'status:created', { timeout: 4000, filter: (s) => (s.content || '') === `Hidden status ${ts}` })
      .then(() => true)
      .catch(() => false)
  ]);
  if (leak) throw new Error('contacts_except status leaked to excluded contact');
  pass('contacts_except status NOT pushed to excluded contact');

  socketA.close();
  socketB.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n────────────────────────────────────────`);
  console.log(`Results: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
