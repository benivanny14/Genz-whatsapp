/**
 * GENZ WhatsApp e2e — presence privacy (contacts_except) through REAL sockets.
 *
 * Exercises the exact realtime path the frontend uses:
 *   1. Register owner (A), excluded contact (B), allowed contact (C)
 *   2. A adds B + C to contacts, sets online=same_as_last_seen +
 *      lastSeen=contacts_except, and excludes B (PrivacyExcludedContact)
 *   3. B and C connect real socket.io clients and join
 *   4. A connects and joins — the server broadcasts user:online to A's
 *      contacts: C MUST receive it, B (excluded) MUST NOT
 *   5. A disconnects — user:offline: C receives it, B must not
 *
 * Safe to re-run: fresh timestamped users per run (no wiping).
 * Usage: node scripts/e2e-presence-privacy.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { io } = require('socket.io-client');

const BASE = (process.argv[2] || process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

const SUFFIX = Date.now().toString(36);
const PASSWORD = 'GenzTest@2026!';
const stamp = (n) => `255744${String(Date.now() + n).slice(-6)}`;
const USER_A = { username: `pres_a_${SUFFIX}`, phoneNumber: stamp(1), password: PASSWORD };
const USER_B = { username: `pres_b_${SUFFIX}`, phoneNumber: stamp(2), password: PASSWORD };
const USER_C = { username: `pres_c_${SUFFIX}`, phoneNumber: stamp(3), password: PASSWORD };

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

// Connect a real socket.io client, join as the user, and return { socket, events }.
async function connectUser(token, userId) {
  const socket = io(BASE, {
    path: '/socket.io/',
    transports: ['websocket'],
    auth: { token },
    reconnection: false,
    timeout: 5000
  });
  const events = { online: [], offline: [] };
  socket.on('user:online', (d) => events.online.push(d));
  socket.on('user:offline', (d) => events.offline.push(d));
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('socket connect timeout')), 6000);
  });
  socket.emit('user:join', String(userId));
  await sleep(400); // let the server register presence before the owner joins
  return { socket, events };
}

function hasEvent(list, userId) {
  return list.some((d) => String(d.userId || d.user) === String(userId));
}

async function main() {
  console.log(`\nGENZ Presence-Privacy socket e2e → ${BASE}\n`);

  let tokenA, idA, tokenB, idB, tokenC, idC;

  try {
    const reg = await registerOrLogin(USER_A);
    tokenA = reg.token; idA = reg.user?._id || reg.user?.id;
    pass('Register/login owner A');
  } catch (e) { fail('Register/login owner A', e); }
  try {
    const reg = await registerOrLogin(USER_B);
    tokenB = reg.token; idB = reg.user?._id || reg.user?.id;
    pass('Register/login excluded contact B');
  } catch (e) { fail('Register/login excluded contact B', e); }
  try {
    const reg = await registerOrLogin(USER_C);
    tokenC = reg.token; idC = reg.user?._id || reg.user?.id;
    pass('Register/login allowed contact C');
  } catch (e) { fail('Register/login allowed contact C', e); }

  if (!tokenA || !tokenB || !tokenC) { printSummary(); process.exit(1); }

  try {
    await request('/chat/contacts', { method: 'POST', token: tokenA, body: { userId: idB, savedName: 'Bob B' } });
    await request('/chat/contacts', { method: 'POST', token: tokenA, body: { userId: idC, savedName: 'Carol C' } });
    pass('A adds B and C to contacts');
  } catch (e) { fail('A adds contacts', e); }

  try {
    await request('/settings', {
      method: 'PUT',
      token: tokenA,
      body: { privacy: { online: 'same_as_last_seen', lastSeen: 'contacts_except' } }
    });
    pass('A sets online=lastSeen=contacts_except');
  } catch (e) { fail('A sets privacy settings', e); }

  try {
    await request('/privacy/excluded', {
      method: 'POST',
      token: tokenA,
      body: { contactId: idB, privacyType: 'last_seen', contactName: 'Bob B', contactPhone: USER_B.phoneNumber }
    });
    pass('A excludes B from last-seen/presence');
  } catch (e) { fail('A excludes B', e); }

  let socketB = null, socketC = null, socketA = null;
  let eventsB = null, eventsC = null;
  try {
    ({ socket: socketB, events: eventsB } = await connectUser(tokenB, idB));
    ({ socket: socketC, events: eventsC } = await connectUser(tokenC, idC));
    pass('B and C connected via real sockets');
  } catch (e) { fail('Connect B/C sockets', e); }

  if (socketB && socketC) {
    try {
      socketA = io(BASE, {
        path: '/socket.io/',
        transports: ['websocket'],
        auth: { token: tokenA },
        reconnection: false,
        timeout: 5000
      });
      await new Promise((resolve, reject) => {
        socketA.on('connect', resolve);
        socketA.on('connect_error', reject);
        setTimeout(() => reject(new Error('A socket connect timeout')), 6000);
      });
      socketA.emit('user:join', String(idA));
      await sleep(1200); // let the presence broadcast loop run
      pass('A connects and joins (presence broadcast fired)');
    } catch (e) { fail('A connect/join', e); }

    const onlineC = hasEvent(eventsC.online, idA);
    const onlineB = hasEvent(eventsB.online, idA);
    if (onlineC) pass('C (allowed contact) received user:online for A');
    else fail('C receives user:online', new Error('allowed contact did not see A online'));
    if (!onlineB) pass('B (excluded contact) did NOT receive user:online for A');
    else fail('B must not see A online', new Error('excluded contact saw presence'));

    // Disconnect A → user:offline must reach C but not B.
    if (socketA) {
      try {
        socketA.disconnect();
        await sleep(1200);
        const offlineC = hasEvent(eventsC.offline, idA);
        const offlineB = hasEvent(eventsB.offline, idA);
        if (offlineC) pass('C received user:offline for A');
        else fail('C receives user:offline', new Error('allowed contact did not see A offline'));
        if (!offlineB) pass('B did NOT receive user:offline for A');
        else fail('B must not see A offline', new Error('excluded contact saw offline presence'));
      } catch (e) { fail('Presence offline broadcast', e); }
    }
  }

  if (socketB) socketB.disconnect();
  if (socketC) socketC.disconnect();
  if (socketA) socketA.disconnect();

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
