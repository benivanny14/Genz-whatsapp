#!/usr/bin/env node
// CDP Emulator Test — injects JS into Android WebView via Chrome DevTools Protocol
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'ws'));
const { execSync } = require('child_process');
const API = 'http://10.0.2.2:5000';

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function cdpEval(expression) {
  return new Promise(async (resolve, reject) => {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page');
    if (!page) return reject(new Error('No WebView page'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      setTimeout(() => ws.send(JSON.stringify({
        id: 2, method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true }
      })), 400);
    });
    ws.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.id === 2) { resolve(m.result?.result?.value); ws.close(); }
    });
    ws.on('error', reject);
    setTimeout(() => { try { ws.close(); } catch {} reject(new Error('CDP timeout')); }, 20000);
  });
}

function cdpScreenshot() {
  return new Promise(async (resolve) => {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page');
    if (!page) return resolve(null);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      setTimeout(() => ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } })), 300);
    });
    ws.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.id === 2 && m.result) { resolve(m.result.data); ws.close(); }
    });
    ws.on('error', () => resolve(null));
    setTimeout(() => { try { ws.close(); } catch {} resolve(null); }, 10000);
  });
}

function api(method, urlPath, body, token) {
  const opts = {
    hostname: 'localhost', port: 5000, path: urlPath,
    method, headers: { 'Authorization': 'Bearer ' + token }
  };
  if (body) opts.headers['Content-Type'] = 'application/json';
  return new Promise((resolve, reject) => {
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function apiUpload(filePath, token) {
  const boundary = '----TestBoundary' + Date.now();
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  const mimeTypes = { png: 'image/png', wav: 'audio/wav', mp4: 'video/mp4' };
  const mime = mimeTypes[ext] || 'application/octet-stream';
  
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: ${mime}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileData, footer]);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/media/upload', method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function makeWavBuffer() {
  const sr = 8000, n = sr;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(i * 0.1) * 16000), 44 + i * 2);
  return buf;
}

function makePngBuffer() {
  // 1x1 green pixel PNG
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8z8BQz0BFwMgwasCoAgA/VQH9mUBMFwAAAABJRU5ErkJggg==', 'base64');
}

async function main() {
  console.log('🚀 CDP EMULATOR TEST — Android WebView\n');

  // Get token via backend API
  const login = await api('POST', '/api/auth/login', { identifier: 'testuser1', password: 'TestPass123!@#' });
  const token = login.token;
  console.log('✅ Backend login:', login.user?.username);

  // Inject token into WebView
  await cdpEval(`localStorage.setItem('genz_token','${token}');localStorage.setItem('genz_user',JSON.stringify({username:'testuser1'}))`);
  const tokenCheck = await cdpEval(`localStorage.getItem('genz_token')?.substring(0,10)`);
  console.log('✅ Token injected into WebView:', tokenCheck + '...');

  // Test 1: Text Status
  console.log('\n━━━ 1/8 TEXT STATUS ━━━');
  const t1 = await api('POST', '/api/advanced/status', { type: 'text', content: 'Habari za CDP! 🔥', backgroundColor: '#00a884', textColor: '#ffffff' }, token);
  console.log(t1.success ? '  ✅ PASS' : `  ❌ FAIL: ${t1.message}`);

  // Test 2: Image Status (upload + create)
  console.log('\n━━━ 2/8 IMAGE STATUS ━━━');
  const pngFile = 'test-png.png';
  fs.writeFileSync(pngFile, makePngBuffer());
  const imgUpload = await apiUpload(pngFile, token);
  if (imgUpload.success) {
    const t2 = await api('POST', '/api/advanced/status', { type: 'image', content: 'Picha CDP 📸', mediaUrl: imgUpload.fileUrl, mediaType: 'image/png' }, token);
    console.log(t2.success ? '  ✅ PASS' : `  ❌ FAIL: ${t2.message}`);
  } else console.log(`  ❌ FAIL (upload): ${imgUpload.message}`);

  // Test 3: Location Status
  console.log('\n━━━ 3/8 LOCATION STATUS ━━━');
  const t3 = await api('POST', '/api/advanced/status', { type: 'location', content: 'Niko DSM 📍', locationData: { lat: -6.7924, lng: 39.2083, name: 'Dar es Salaam' } }, token);
  console.log(t3.success ? '  ✅ PASS' : `  ❌ FAIL: ${t3.message}`);

  // Test 4: Voice Status (WAV upload + create)
  console.log('\n━━━ 4/8 VOICE STATUS ━━━');
  const wavFile = 'test-voice.wav';
  fs.writeFileSync(wavFile, makeWavBuffer());
  const voUpload = await apiUpload(wavFile, token);
  if (voUpload.success) {
    const t4 = await api('POST', '/api/advanced/status', { type: 'voice', content: 'Sauti CDP 🎤', mediaUrl: voUpload.fileUrl, mediaType: 'audio/wav' }, token);
    console.log(t4.success ? '  ✅ PASS' : `  ❌ FAIL: ${t4.message}`);
  } else console.log(`  ❌ FAIL (upload): ${voUpload.message}`);

  // Test 5: Music Status (WAV upload + create)
  console.log('\n━━━ 5/8 MUSIC STATUS ━━━');
  const muUpload = await apiUpload(wavFile, token);
  if (muUpload.success) {
    const t5 = await api('POST', '/api/advanced/status', { type: 'music', content: 'Muziki CDP 🎵', mediaUrl: muUpload.fileUrl, mediaType: 'audio/wav' }, token);
    console.log(t5.success ? '  ✅ PASS' : `  ❌ FAIL: ${t5.message}`);
  } else console.log(`  ❌ FAIL (upload): ${muUpload.message}`);

  // Test 6: Voice Message Upload
  console.log('\n━━━ 6/8 VOICE MESSAGE UPLOAD ━━━');
  const vmUpload = await apiUpload(wavFile, token);
  console.log(vmUpload.success ? `  ✅ PASS (${vmUpload.fileUrl?.substring(0, 50)}...)` : `  ❌ FAIL: ${vmUpload.message}`);

  // Test 7: WINGA Product with image
  console.log('\n━━━ 7/8 WINGA PRODUCT ━━━');
  const prodUpload = await apiUpload(pngFile, token);
  if (prodUpload.success) {
    const t7 = await api('POST', '/api/products', { name: 'Bidhaa CDP', price: 15000, description: 'Test product kwa CDP', image: prodUpload.fileUrl }, token);
    const list = await api('GET', '/api/products', null, token);
    console.log(t7.success ? `  ✅ PASS (${list.products?.length} products total)` : `  ❌ FAIL: ${t7.message}`);
  } else console.log(`  ❌ FAIL (upload): ${prodUpload.message}`);

  // Test 8: Verify all statuses
  console.log('\n━━━ 8/8 VERIFY ALL ━━━');
  const allStatuses = await api('GET', '/api/advanced/status', null, token);
  const allProducts = await api('GET', '/api/products', null, token);
  const types = [...new Set((allStatuses.statuses || []).map(s => s.type))];
  console.log(`  📊 Statuses: ${allStatuses.statuses?.length || 0} — types: ${types.join(', ')}`);
  console.log(`  📊 Products: ${allProducts.products?.length || 0}`);

  // Screenshot
  console.log('\n━━━ SCREENSHOT ━━━');
  const ss = await cdpScreenshot();
  if (ss) {
    fs.writeFileSync('emulator-screenshot.png', Buffer.from(ss, 'base64'));
    console.log('  📸 Screenshot saved: emulator-screenshot.png');
  }

  // Navigate to chat for visual check
  console.log('\n━━━ NAVIGATING TO CHAT ━━━');
  await cdpEval(`window.location.href = '/chat'`);
  await new Promise(r => setTimeout(r, 5000));
  const chatState = await cdpEval(`JSON.stringify({url:location.href,body:document.body?.innerText?.substring(0,200)})`);
  console.log('  Page:', chatState);

  // Final screenshot of chat page
  const ss2 = await cdpScreenshot();
  if (ss2) {
    fs.writeFileSync('chat-screenshot.png', Buffer.from(ss2, 'base64'));
    console.log('  📸 Chat screenshot saved: chat-screenshot.png');
  }

  // ── SUMMARY ──
  const results = [t1, t3, t4, t5, vmUpload, t7].filter(Boolean);
  const passed = results.filter(r => r.success !== false).length;
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏆 RESULTS: ${passed}/${results.length} PASSED`);
  if (passed === results.length) {
    console.log('🎉 KILA KITU KAPO SAWA 100%!');
  } else {
    console.log('⚠️ Baadhi ya features hazijafanya kazi');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
