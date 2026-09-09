#!/usr/bin/env node
/**
 * 🔬 DEFINITIVE E2E TEST — Genz WhatsApp
 * Single run: register 2 users, test all features, no rate limit issues
 */
const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const hdrs = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) hdrs['Authorization'] = 'Bearer ' + token;
    const req = http.request('http://localhost:5000' + path, { method: 'POST', headers: hdrs }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, ...JSON.parse(d) }); } catch { resolve({ s: res.statusCode, raw: d.substring(0, 500) }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const hdrs = {};
    if (token) hdrs['Authorization'] = 'Bearer ' + token;
    const req = http.request('http://localhost:5000' + path, { method: 'GET', headers: hdrs }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, ...JSON.parse(d) }); } catch { resolve({ s: res.statusCode, raw: d.substring(0, 500) }); } });
    });
    req.on('error', reject); req.end();
  });
}

const R = [];
function ok(n, d = '') { R.push([n, true, d]); console.log(`  ✅ ${n} — ${d}`); }
function fail(n, d = '') { R.push([n, false, d]); console.log(`  ❌ ${n} — ${d}`); }

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔬 DEFINITIVE E2E TEST — GENZ WHATSAPP');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── 1. Register 2 users ──
  console.log('📋 STEP 1: Register test users...');
  const ts = Date.now();
  const r1 = await post('/api/auth/register', { username: 'defA' + ts, phoneNumber: '255801' + String(ts).slice(-8), password: 'TestLive123!' });
  if (!r1.token) { console.log('  FATAL: Cannot register user1', JSON.stringify(r1).substring(0, 200)); process.exit(1); }
  ok('Register User1', `ID: ${r1.user._id}`);

  const r2 = await post('/api/auth/register', { username: 'defB' + ts, phoneNumber: '255802' + String(ts).slice(-8), password: 'TestLive123!' });
  if (!r2.token) { console.log('  FATAL: Cannot register user2', JSON.stringify(r2).substring(0, 200)); process.exit(1); }
  ok('Register User2', `ID: ${r2.user._id}`);

  const t1 = r1.token, t2 = r2.token;
  const uid1 = r1.user._id, uid2 = r2.user._id;

  // Verify auth
  const me = await get('/api/auth/me', t1);
  if (me.s === 200) ok('Auth /me', me.user.username);
  else fail('Auth /me', `HTTP ${me.s}: ${me.message}`);

  // ── 2. Status tests ──
  console.log('\n📸 STEP 2: Status posting (5 types)...');
  const statusTests = [
    ['image', { type: 'image', content: 'Photo test', mediaUrl: 'https://picsum.photos/400/300' }],
    ['video', { type: 'video', content: 'Video test', mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' }],
    ['voice', { type: 'voice', content: 'Voice test', mediaUrl: 'https://example.com/test-voice.webm' }],
    ['location', { type: 'location', content: 'Dar es Salaam', locationData: { latitude: -6.7924, longitude: 39.2083, name: 'Dar es Salaam', address: 'Tanzania' } }],
    ['text', { type: 'text', content: 'Text status E2E test 🎉' }],
  ];

  for (const [name, body] of statusTests) {
    const r = await post('/api/advanced/status', body, t1);
    if (r.s === 201) ok(`Status — ${name}`, `Created (${r.status?._id || 'ok'})`);
    else fail(`Status — ${name}`, `HTTP ${r.s}: ${r.message || JSON.stringify(r).substring(0, 100)}`);
  }

  // Fetch statuses
  const sf = await get('/api/advanced/status', t1);
  if (sf.s === 200) {
    const types = (sf.statuses || []).map(s => s.type);
    ok('Statuses — fetch own', `${sf.statuses.length} statuses: [${types.join(', ')}]`);
  } else fail('Statuses — fetch', `HTTP ${sf.s}: ${sf.message}`);

  // ── 3. Chat tests ──
  console.log('\n💬 STEP 3: Chat messaging...');
  const conv = await post('/api/chat/conversation', { userId: uid2 }, t1);
  const cid = conv.data?._id || conv.conversation?._id;
  if (conv.s === 200 || conv.s === 201) ok('Create conversation', cid);
  else fail('Create conversation', `HTTP ${conv.s}: ${conv.message || JSON.stringify(conv).substring(0, 150)}`);

  if (cid) {
    const msgTests = [
      ['text', { conversationId: cid, content: 'Hello from E2E! 🎉', type: 'text' }],
      ['image', { conversationId: cid, content: 'Check photo!', type: 'image', mediaUrl: 'https://picsum.photos/400/300' }],
      ['video', { conversationId: cid, content: 'Check video!', type: 'video', mediaUrl: 'https://example.com/video.mp4' }],
      ['audio/voice', { conversationId: cid, content: 'https://example.com/voice.webm', type: 'audio', isVoiceNote: true }],
      ['font', { conversationId: cid, content: 'Custom font!', type: 'text', font: 'lilita-one' }],
      ['viewOnce', { conversationId: cid, content: 'Secret!', type: 'image', mediaUrl: 'https://picsum.photos/400/300', isViewOnce: true }],
    ];

    for (const [name, body] of msgTests) {
      const r = await post('/api/chat/messages', body, t1);
      if (r.s === 200 || r.s === 201) ok(`Msg — ${name}`, 'Sent');
      else fail(`Msg — ${name}`, `HTTP ${r.s}: ${r.message || JSON.stringify(r).substring(0, 100)}`);
    }

    // Verify received (route is /conversations/:id/messages — plural!)
    const recv = await get('/api/chat/conversations/' + cid + '/messages?limit=10', t2);
    if (recv.s === 200) {
      const types = (recv.messages || []).map(m => m.type);
      ok('Messages — received', `${recv.messages.length} msgs: [${types.join(', ')}]`);
    } else fail('Messages — received', `HTTP ${recv.s}: ${recv.message}`);
  }

  // ── 4. WINGA tests ──
  console.log('\n🛒 STEP 4: WINGA marketplace...');
  const wCreate = await post('/api/winga', {
    title: 'Test Product E2E',
    description: 'Testing marketplace listing',
    price: 25000,
    category: 'simu',
    media: [{ url: 'https://picsum.photos/400/300', type: 'image' }]
  }, t1);
  if (wCreate.s === 200 || wCreate.s === 201) ok('WINGA — create listing', JSON.stringify(wCreate).substring(0, 100));
  else fail('WINGA — create listing', `HTTP ${wCreate.s}: ${wCreate.message || JSON.stringify(wCreate).substring(0, 150)}`);

  const wList = await get('/api/winga', t1);
  if (wList.s === 200) ok('WINGA — fetch listings', `${wList.categories?.length || wList.data?.categories?.length || '?'} categories`);
  else fail('WINGA — fetch', `HTTP ${wList.s}`);

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════════════════');
  const pass = R.filter(r => r[1]).length;
  const failCount = R.filter(r => !r[1]).length;
  console.log(`  📊 TOTAL: ${R.length} | ✅ PASS: ${pass} | ❌ FAIL: ${failCount}`);
  if (failCount > 0) {
    console.log('\n  ❌ FAILURES:');
    R.filter(r => !r[1]).forEach(r => console.log(`    - ${r[0]}: ${r[2]}`));
  }
  console.log(`\n  🎯 SCORE: ${pass}/${R.length} (${Math.round(pass / R.length * 100)}%)`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
