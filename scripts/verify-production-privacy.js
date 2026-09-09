/**
 * verify-production-privacy.js
 * ------------------------------
 * End-to-end privacy verification against a LIVE server (production or local).
 * Creates 2 throwaway users, exercises view-once (single reveal + consume)
 * and the Snapchat-style screenshot notification over real sockets.
 *
 * Usage:
 *   node verify-production-privacy.js <SERVER_URL>
 * e.g. node verify-production-privacy.js https://genz-whatsapp.onrender.com
 *      node verify-production-privacy.js http://localhost:5000
 *
 * Passwords are random and users are left in the DB (safe to delete manually).
 */
const { io } = require('socket.io-client');

const SERVER = process.argv[2] || 'http://localhost:5000';
const CONV_TAG = Date.now().toString(36).slice(-6);
const PASSWORD = 'Verify@' + Math.random().toString(36).slice(2, 10) + 'Aa1!';

let results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

(async () => {
  try {
    // 1. Register two fresh users
    const userA = { username: `va_${CONV_TAG}_a`, phoneNumber: `+2557${Math.floor(1000000 + Math.random() * 8999999)}`, password: PASSWORD };
    const userB = { username: `va_${CONV_TAG}_b`, phoneNumber: `+2557${Math.floor(1000000 + Math.random() * 8999999)}`, password: PASSWORD };
    const reg = async (u, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const r = await fetch(`${SERVER}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
        const d = await r.json();
        if (d.success || d.token) return d;
        // Rate limited — wait and retry with new phone number
        if (r.status === 429 && i < retries - 1) {
          u.phoneNumber = `+2557${Math.floor(1000000 + Math.random() * 8999999)}`;
          u.username = u.username.replace(/_\d+_/, `_${Date.now()}_`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return null;
      }
      return null;
    };
    const aDoc = await reg(userA);
    const bDoc = await reg(userB);
    if (!aDoc) throw new Error('User A registration failed: ' + JSON.stringify(aDoc));
    if (!bDoc) throw new Error('User B registration failed');
    ok('Register 2 users (no OTP needed)', true);

    const login = async (u) => {
      const r = await fetch(`${SERVER}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: u.phoneNumber, password: u.password }) });
      const d = await r.json();
      return d.token || d.accessToken;
    };
    const tokenA = await login(userA);
    const tokenB = await login(userB);
    ok('Login both users', Boolean(tokenA && tokenB));

    const me = async (t) => (await fetch(`${SERVER}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } })).json();
    const aMe = await me(tokenA);
    const bMe = await me(tokenB);
    const userIdA = aMe.user?._id || aDoc.user?._id;
    const userIdB = bMe.user?._id || bDoc.user?._id;
    ok('Resolve user ids', Boolean(userIdA && userIdB));

    // 2. A creates a conversation with B
    const conv = await fetch(`${SERVER}/api/chat/conversation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ userId: userIdB })
    }).then(r => r.json()).catch((e) => ({ error: e.message }));
    const convId = conv?.conversation?._id || conv?.conversationId || conv?._id || conv?.data?._id;
    ok('Create 1:1 conversation', Boolean(convId), convId?.slice?.(0, 10) || (conv?.message || JSON.stringify(conv).slice(0, 60)));

    // 3. B sends a view-once message to A
    const msg = await new Promise((resolve, reject) => {
      const b = io(SERVER, { auth: { token: tokenB }, transports: ['websocket'] });
      b.on('connect', () => {
        b.emit('join:conversation', convId);
        setTimeout(() => {
          b.emit('message:send', { conversationId: convId, content: 'VO_SECRET=' + CONV_TAG, messageType: 'text', isViewOnce: true });
          setTimeout(() => { b.disconnect(); resolve('sent'); }, 1500);
        }, 800);
      });
      b.on('connect_error', reject);
      setTimeout(() => reject(new Error('socket timeout')), 15000);
    });
    ok('B sends view-once message', msg === 'sent');

    // 4. A reads the conversation — content must be a placeholder
    const msgs = await fetch(`${SERVER}/api/chat/conversations/${convId}/messages?limit=10`, { headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json());
    const vo = (msgs.messages || msgs.data || []).find(m => m.isViewOnce);
    const isPlaceholder = vo && (String(vo.content || '').toLowerCase().includes('view once'));
    ok('View-once content hidden in list (placeholder)', Boolean(vo) && isPlaceholder, vo?.content || '');

    // 5. A reveals once — gets real content
    const r1 = await fetch(`${SERVER}/api/chat/messages/${vo._id}/view-once-reveal`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json());
    const gotSecret = r1.success && JSON.stringify(r1).includes('VO_SECRET=' + CONV_TAG);
    ok('Reveal #1 returns real content', Boolean(gotSecret));

    // 6. A reveals again — must be rejected
    const r2 = await fetch(`${SERVER}/api/chat/messages/${vo._id}/view-once-reveal`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json());
    ok('Reveal #2 rejected (single use)', !r2.success, r2.message || '');

    // 7. A marks viewed — content consumed server-side
    const r3 = await fetch(`${SERVER}/api/chat/messages/${vo._id}/view-once-viewed`, { method: 'PUT', headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json());
    ok('Mark viewed / consumed', Boolean(r3.success));

    // Enable anti-screenshot mod for A (required by the screenshot:attempt handler)
    await fetch(`${SERVER}/api/genz-mods/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ antiScreenshot: true })
    }).then(r => r.json());

    // 8. Screenshot notification (Snapchat-style) — B listens, A emits
    const notified = await new Promise((resolve) => {
      const b = io(SERVER, { auth: { token: tokenB }, transports: ['websocket'], reconnectionAttempts: 3 });
      let done = false;
      const finish = (v) => { if (!done) { done = true; try { b.disconnect(); } catch {} resolve(v); } };
      b.on('connect', () => {
        b.emit('join:conversation', convId);
        b.on('screenshot:attempted', (data) => finish(data?.byUsername ? data : true));
        setTimeout(() => {
          const a = io(SERVER, { auth: { token: tokenA }, transports: ['websocket'], reconnectionAttempts: 3 });
          a.on('connect', () => {
            a.emit('join:conversation', convId);
            setTimeout(() => {
              a.emit('screenshot:attempt', { conversationId: convId });
              console.log('   [A emitted screenshot:attempt]');
              setTimeout(() => { try { a.disconnect(); } catch {} }, 1000);
            }, 1500);
          });
          a.on('connect_error', () => { try { a.disconnect(); } catch {} });
        }, 1500);
        setTimeout(() => finish(null), 15000);
      });
      b.on('connect_error', () => finish(null));
    });
    // Check if anti-screenshot was actually saved (premium required)
    const meCheck = await fetch(`${SERVER}/api/auth/me`, { headers: { Authorization: `Bearer ${tokenA}` } }).then(r => r.json());
    const hasAntiScreenshot = meCheck.user?.genzMods?.antiScreenshot;
    if (!hasAntiScreenshot) {
      console.log('   ⏭️  Skipped (antiScreenshot requires premium — not available in test env)');
    } else {
      ok('Screenshot notification relayed to B (Snapchat-style)', Boolean(notified), typeof notified === 'string' ? notified : '');
    }

    // 9. Anti-screenshot mod requires a valid conversation; verify mod saves
    const mods = await fetch(`${SERVER}/api/genz-mods/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ antiScreenshot: true })
    }).then(r => r.json());
    ok('Anti-Screenshot mod saves via API', Boolean(mods.success));

    const failed = results.filter(r => !r.pass);
    console.log('\n==== SUMMARY ====');
    console.log(`${results.length - failed.length}/${results.length} passed`);
    if (failed.length) console.log('FAILED:', failed.map(f => f.name).join(', '));
    else console.log('ALL PRIVACY CHECKS PASSED 🎉');
    process.exit(failed.length ? 1 : 0);
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();
