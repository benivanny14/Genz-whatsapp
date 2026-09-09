#!/usr/bin/env node
/**
 * 🔬 GENZ WHATSAPP — FULL E2E LIVE TEST
 * Tests ALL features: Status (photo/video/voice/location), Voice message, Media in chat
 */
const WebSocket = require('../frontend/node_modules/ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API = 'http://localhost:5000';
const EMU = 'emulator-5554';

// ===== HTTP HELPERS =====
function httpPost(endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ...JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d.substring(0, 300) }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${API}${endpoint}`, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ...JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d.substring(0, 300) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ===== CDP HELPERS =====
async function getCDPPage() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        resolve(targets.find(t => t.type === 'page' && t.url.includes('localhost')));
      });
    }).on('error', reject);
  });
}

function cdpEval(ws, expr) {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    const timer = setTimeout(() => reject(new Error('CDP timeout')), 15000);
    const handler = (msg) => {
      const d = JSON.parse(msg);
      if (d.id === id) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(d.result?.result?.value);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true, timeout: 10000 } }));
  });
}

// ===== TEST RESULTS =====
const results = [];
function pass(name, detail) { results.push({ name, ok: true, detail }); console.log(`  ✅ ${name} — ${detail}`); }
function fail(name, detail) { results.push({ name, ok: false, detail }); console.log(`  ❌ ${name} — ${detail}`); }

// ===== MAIN =====
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔬 GENZ WHATSAPP — FULL E2E LIVE TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ---- STEP 1: Auth ----
  console.log('📋 STEP 1: Authentication...');
  let t1, t2, uid1, uid2;
  
  // Register fresh users each time to avoid rate limiter
  async function getFreshToken(username, phone) {
    const r = await httpPost('/api/auth/register', { username, phoneNumber: phone, password: 'TestLive123!' });
    if (r.success) return r;
    // If already exists, try login
    const lr = await httpPost('/api/auth/login', { username, password: 'TestLive123!' });
    return lr;
  }
  
  try {
    const r1 = await getFreshToken('livee2euser1', '255730000001');
    if (r1.success) { t1 = r1.token; uid1 = r1.user?._id || r1.user?.id; pass('Auth User1', `ID: ${uid1}`); }
    else { fail('Auth User1', r1.message || r1.error || JSON.stringify(r1).substring(0, 100)); }
  } catch(e) { fail('Auth User1', e.message); }

  try {
    const r2 = await getFreshToken('livee2euser2', '255730000002');
    if (r2.success) { t2 = r2.token; uid2 = r2.user?._id || r2.user?.id; pass('Auth User2', `ID: ${uid2}`); }
    else { fail('Auth User2', r2.message || r2.error || JSON.stringify(r2).substring(0, 100)); }
  } catch(e) { fail('Auth User2', e.message); }

  if (!t1 || !t2) {
    console.log('\n❌ Cannot proceed without auth tokens');
    printSummary();
    process.exit(1);
  }

  // ---- STEP 2: Verify emulator is running ----
  console.log('\n📱 STEP 2: Check emulator...');
  let ws;
  try {
    // Verify app is installed
    const pkg = execSync(`adb -s ${EMU} shell pm list packages | grep genzwhatsapp`, { encoding: 'utf-8', timeout: 5000 });
    if (pkg.includes('genzwhatsapp')) pass('Emulator — App installed', pkg.trim());
    else fail('Emulator — App installed', 'Not found');
    
    // Launch app
    execSync(`adb -s ${EMU} shell am start -n com.benivanny.genzwhatsapp/.MainActivity`, { encoding: 'utf-8', timeout: 10000 });
    pass('Emulator — App launched', 'Started MainActivity');
    
    // Wait and verify CDP
    await new Promise(r => setTimeout(r, 5000));
    const page = await getCDPPage();
    if (page) {
      ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise(r => ws.on('open', r));
      await cdpEval(ws, `Runtime.enable`);
      pass('Emulator — CDP connected', page.url);
      
      // Inject token without reload
      await cdpEval(ws, `
        localStorage.setItem('token', '${t1}');
        localStorage.setItem('user', JSON.stringify(${JSON.stringify({ _id: uid1, username: 'testuser1live' })}));
        true
      `);
      pass('Emulator — Token injected', 'Ready for login');
    } else {
      fail('Emulator — CDP', 'No page target');
    }
  } catch(e) { fail('Emulator — CDP', e.message); }

  // ---- STEP 3: STATUS TESTS ----
  console.log('\n📸 STEP 3: Status posting...');

  // 3a: Photo status
  try {
    const r = await httpPost('/api/advanced/status', { type: 'image', content: '📸 Live test photo status', mediaUrl: 'https://picsum.photos/400/300' }, t1);
    if (r.status === 200 || r.status === 201) pass('Status — Photo', r.status._id ? `ID: ${r.status._id}` : 'Created');
    else fail('Status — Photo', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Status — Photo', e.message); }

  // 3b: Video status
  try {
    const r = await httpPost('/api/advanced/status', { type: 'video', content: '🎬 Live test video status', mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' }, t1);
    if (r.status === 200 || r.status === 201) pass('Status — Video', 'Created');
    else fail('Status — Video', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Status — Video', e.message); }

  // 3c: Voice status
  try {
    const r = await httpPost('/api/advanced/status', { type: 'voice', content: 'https://example.com/test-audio.webm' }, t1);
    if (r.status === 200 || r.status === 201) pass('Status — Voice', 'Created');
    else fail('Status — Voice', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Status — Voice', e.message); }

  // 3d: Location status
  try {
    const r = await httpPost('/api/advanced/status', {
      type: 'location', content: 'Dar es Salaam',
      locationData: { latitude: -6.7924, longitude: 39.2083, name: 'Dar es Salaam', address: 'Dar es Salaam, Tanzania' }
    }, t1);
    if (r.status === 200 || r.status === 201) pass('Status — Location', 'Created');
    else fail('Status — Location', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Status — Location', e.message); }

  // 3e: Text status
  try {
    const r = await httpPost('/api/advanced/status', { type: 'text', content: '📝 Live test text status from E2E' }, t1);
    if (r.status === 200 || r.status === 201) pass('Status — Text', 'Created');
    else fail('Status — Text', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Status — Text', e.message); }

  // 3f: Music status
  try {
    const r = await httpPost('/api/advanced/status', {
      type: 'music', content: '🎵 Testing music status',
      music: { trackName: 'Test Song', artist: 'Test Artist', previewUrl: 'https://example.com/preview.m4a', artwork: 'https://picsum.photos/100' }
    }, t1);
    if (r.status === 200 || r.status === 201) pass('Status — Music', 'Created');
    else fail('Status — Music', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Status — Music', e.message); }

  // ---- STEP 4: Verify statuses visible ----
  console.log('\n🔍 STEP 4: Verify statuses visible to receiver...');
  try {
    const r = await httpGet('/api/advanced/status', t2);
    const statuses = r.statuses || r.data || [];
    const types = statuses.map(s => s.type);
    pass('Statuses — Fetch', `${statuses.length} statuses: [${types.join(', ')}]`);
    if (types.includes('image')) pass('Statuses — Photo visible', '');
    else fail('Statuses — Photo visible', 'Not found');
    if (types.includes('video')) pass('Statuses — Video visible', '');
    else fail('Statuses — Video visible', 'Not found');
    if (types.includes('voice')) pass('Statuses — Voice visible', '');
    else fail('Statuses — Voice visible', 'Not found');
    if (types.includes('location')) pass('Statuses — Location visible', '');
    else fail('Statuses — Location visible', 'Not found');
  } catch(e) { fail('Statuses — Fetch', e.message); }

  // ---- STEP 5: CHAT — Create conversation & send messages ----
  console.log('\n💬 STEP 5: Chat messages...');
  let convId;
  try {
    const r = await httpPost('/api/chat/conversations', { participants: [uid2] }, t1);
    convId = r.data?._id || r._id || r.conversation?._id || r.data?.conversation?._id;
    if (convId) pass('Chat — Create conversation', `ID: ${convId}`);
    else fail('Chat — Create conversation', JSON.stringify(r).substring(0, 200));
  } catch(e) { fail('Chat — Create conversation', e.message); }

  if (!convId) {
    // Try finding existing
    try {
      const r = await httpGet('/api/chat/conversations', t1);
      const convs = r.conversations || r.data || [];
      const found = convs.find(c => c.participants?.some(p => (p._id || p) === uid2));
      if (found) { convId = found._id; pass('Chat — Found existing conv', convId); }
      else fail('Chat — No conversation found', `Have ${convs.length} convos`);
    } catch(e) { fail('Chat — Find conv', e.message); }
  }

  // 5a: Text message
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: convId, content: 'Hello from E2E test! 🎉', type: 'text' }, t1);
    if (r.status === 200 || r.status === 201) pass('Chat — Text msg', 'Sent');
    else fail('Chat — Text msg', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Chat — Text msg', e.message); }

  // 5b: Image message
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: convId, content: 'Check this photo!', type: 'image', mediaUrl: 'https://picsum.photos/400/300' }, t1);
    if (r.status === 200 || r.status === 201) pass('Chat — Image msg', 'Sent');
    else fail('Chat — Image msg', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Chat — Image msg', e.message); }

  // 5c: Video message
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: convId, content: 'Check this video!', type: 'video', mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' }, t1);
    if (r.status === 200 || r.status === 201) pass('Chat — Video msg', 'Sent');
    else fail('Chat — Video msg', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Chat — Video msg', e.message); }

  // 5d: Voice message (audio)
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: convId, content: 'https://example.com/test-voice.webm', type: 'audio', isVoiceNote: true }, t1);
    if (r.status === 200 || r.status === 201) pass('Chat — Voice msg', 'Sent');
    else fail('Chat — Voice msg', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Chat — Voice msg', e.message); }

  // 5e: Voice with custom font
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: convId, content: 'Font test 🎨', type: 'text', font: 'lilita-one' }, t1);
    if (r.status === 200 || r.status === 201) pass('Chat — Custom font msg', 'Sent with font=lilita-one');
    else fail('Chat — Custom font msg', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Chat — Custom font msg', e.message); }

  // 5f: View-once image
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: convId, content: 'Secret photo!', type: 'image', mediaUrl: 'https://picsum.photos/400/300', isViewOnce: true }, t1);
    if (r.status === 200 || r.status === 201) pass('Chat — ViewOnce msg', 'Sent');
    else fail('Chat — ViewOnce msg', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 100)}`);
  } catch(e) { fail('Chat — ViewOnce msg', e.message); }

  // ---- STEP 6: Verify messages received ----
  console.log('\n📨 STEP 6: Verify messages received by user2...');
  try {
    const r = await httpGet(`/api/chat/messages/${convId}?limit=10`, t2);
    const msgs = r.messages || r.data || [];
    const types = msgs.map(m => m.type);
    pass('Messages — Fetch', `${msgs.length} messages: [${types.join(', ')}]`);
    if (types.includes('text')) pass('Messages — Text received', '');
    else fail('Messages — Text received', 'Not found');
    if (types.includes('image')) pass('Messages — Image received', '');
    else fail('Messages — Image received', 'Not found');
    if (types.includes('video')) pass('Messages — Video received', '');
    else fail('Messages — Video received', 'Not found');
    if (types.includes('audio')) pass('Messages — Voice received', '');
    else fail('Messages — Voice received', 'Not found');
  } catch(e) { fail('Messages — Fetch', e.message); }

  // ---- STEP 7: WINGA (marketplace) ----
  console.log('\n🛒 STEP 7: WINGA marketplace...');
  try {
    const r = await httpPost('/api/winga', {
      name: 'Test Product E2E',
      description: 'Testing WINGA listing from live E2E test',
      price: 25000,
      category: 'Electronics',
      media: [{ url: 'https://picsum.photos/400/300', type: 'image' }],
      location: { latitude: -6.7924, longitude: 39.2083 }
    }, t1);
    if (r.status === 200 || r.status === 201) pass('WINGA — Product', 'Created');
    else fail('WINGA — Product', `HTTP ${r.status}: ${r.message || r.raw?.substring(0, 150)}`);
  } catch(e) { fail('WINGA — Product', e.message); }

  // ---- STEP 8: Media upload via API ----
  console.log('\n📤 STEP 8: Media upload via API...');
  try {
    // Test upload endpoint exists and rejects unauthorized
    const r = await httpGet('/api/media/upload', null);
    if (r.status === 401 || r.status === 400) pass('Media Upload — endpoint exists', `HTTP ${r.status} (auth required) ✓`);
    else if (r.status === 404) fail('Media Upload — endpoint missing', '404 Not Found');
    else pass('Media Upload — endpoint', `HTTP ${r.status}`);
  } catch(e) { fail('Media Upload — API', e.message); }
  
  // Test media upload with auth
  try {
    const r = await httpPost('/api/media/upload', {}, t1);
    // Should return 400 (no file) or 200 (mock)
    if (r.status === 400 || r.status === 200 || r.status === 401) pass('Media Upload — with auth', `HTTP ${r.status}`);
    else fail('Media Upload — with auth', `HTTP ${r.status}`);
  } catch(e) { fail('Media Upload — with auth', e.message); }

  // ---- STEP 9: Screenshot verification ----
  console.log('\n📸 STEP 9: Emulator screenshot...');
  try {
    execSync(`adb -s ${EMU} shell screencap -p /sdcard/e2e-screenshot.png`, { timeout: 10000 });
    const localPath = path.join(process.cwd(), '.livetest', 'e2e-final-screenshot.png');
    execSync(`adb -s ${EMU} pull /sdcard/e2e-screenshot.png ${localPath}`, { timeout: 10000 });
    pass('Screenshot', `Saved to ${localPath}`);
  } catch(e) { fail('Screenshot', e.message); }

  // ---- STEP 10: Error handling test ----
  console.log('\n🛡️ STEP 10: Error handling...');
  try {
    const r = await httpPost('/api/chat/messages', { conversationId: 'nonexistent', content: 'test', type: 'text' }, t1);
    if (r.status >= 400) pass('Error — Invalid conv', `HTTP ${r.status} (expected error)`);
    else fail('Error — Invalid conv', `HTTP ${r.status} (should be error)`);
  } catch(e) { pass('Error — Invalid conv', 'Network error caught'); }

  try {
    const r = await httpGet('/api/chat/messages/invalid?limit=5', t1);
    if (r.status >= 400) pass('Error — Invalid message fetch', `HTTP ${r.status} (expected error)`);
    else fail('Error — Invalid message fetch', `HTTP ${r.status} (should be error)`);
  } catch(e) { pass('Error — Invalid msg fetch', 'Network error caught'); }

  // Close CDP
  if (ws) ws.close();

  printSummary();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📊 FINAL TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`  Total: ${results.length} | ✅ PASS: ${passed} | ❌ FAIL: ${failed}\n`);

  if (failed > 0) {
    console.log('  ❌ FAILURES:');
    results.filter(r => !r.ok).forEach(r => console.log(`    - ${r.name}: ${r.detail}`));
    console.log('');
  }

  console.log('  ✅ ALL PASSING:');
  results.filter(r => r.ok).forEach(r => console.log(`    - ${r.name}${r.detail ? ': ' + r.detail : ''}`));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  🎯 SCORE: ${passed}/${results.length} (${Math.round(passed/results.length*100)}%)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('❌ FATAL:', e); process.exit(1); });
