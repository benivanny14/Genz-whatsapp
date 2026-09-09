#!/usr/bin/env node
/**
 * LIVE E2E TEST — Genz WhatsApp
 * Tests: Status (photo/video/voice/location), Voice messages, Media in chat
 */
const WebSocket = require('../frontend/node_modules/ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_BASE = 'http://localhost:5000';
const CDP_PORT = 9222;
const EMU = 'emulator-5554';

// ===== CDP HELPER =====
function getCDPTarget() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const page = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
          if (page) resolve(page);
          else reject(new Error('No page target found'));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function cdpCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
    const handler = (msg) => {
      const data = JSON.parse(msg);
      if (data.id === id) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluateJS(ws, expression) {
  const result = await cdpCommand(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 10000
  });
  return result?.result?.value;
}

// ===== ADB HELPER =====
function adb(cmd) {
  try {
    return execSync(`adb -s ${EMU} ${cmd}`, { encoding: 'utf-8', timeout: 10000 }).trim();
  } catch (e) { return ''; }
}

function adbShell(cmd) {
  return adb(`shell "${cmd}"`);
}

// ===== AUTH HELPERS =====
async function loginAPI(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password });
    const req = http.request(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function apiPost(endpoint, token, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function apiGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ===== TEST RESULTS =====
const results = [];
function record(name, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ name, status, detail });
  console.log(`  ${icon} ${name}: ${detail}`);
}

// ===== MAIN =====
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🔬 GENZ WHATSAPP — LIVE E2E TEST');
  console.log('═══════════════════════════════════════════════════\n');

  // --- Step 1: Create test users ---
  console.log('📋 STEP 1: Setup test users...');
  let user1, user2;
  try {
    user1 = await loginAPI('testuser1live', 'Test@12345');
    if (!user1.success) {
      // Register
      user1 = await apiPost('/api/auth/register', null, { username: 'testuser1live', password: 'Test@12345', displayName: 'Test User 1' });
      if (user1.status === 201 || user1.status === 200) {
        user1 = await loginAPI('testuser1live', 'Test@12345');
      }
    }
  } catch(e) {
    console.log('  Creating testuser1live...');
    await apiPost('/api/auth/register', null, { username: 'testuser1live', password: 'Test@12345', displayName: 'Test User 1' });
    user1 = await loginAPI('testuser1live', 'Test@12345');
  }

  try {
    user2 = await loginAPI('testuser2live', 'Test@12345');
    if (!user2.success) {
      await apiPost('/api/auth/register', null, { username: 'testuser2live', password: 'Test@12345', displayName: 'Test User 2' });
      user2 = await loginAPI('testuser2live', 'Test@12345');
    }
  } catch(e) {
    console.log('  Creating testuser2live...');
    await apiPost('/api/auth/register', null, { username: 'testuser2live', password: 'Test@12345', displayName: 'Test User 2' });
    user2 = await loginAPI('testuser2live', 'Test@12345');
  }

  const token1 = user1?.data?.token || user1?.token;
  const token2 = user2?.data?.token || user2?.token;

  if (!token1 || !token2) {
    console.log('  ❌ CRITICAL: Cannot authenticate test users');
    console.log('  User1:', JSON.stringify(user1).substring(0, 200));
    console.log('  User2:', JSON.stringify(user2).substring(0, 200));
    process.exit(1);
  }
  console.log(`  ✅ User1: ${user1.data?.user?.username || 'logged in'}`);
  console.log(`  ✅ User2: ${user2.data?.user?.username || 'logged in'}`);
  const userId1 = user1.data?.user?._id || user1.data?.user?.id;
  const userId2 = user2.data?.user?._id || user2.data?.user?.id;
  console.log(`  User1 ID: ${userId1}`);
  console.log(`  User2 ID: ${userId2}\n`);

  // --- Step 2: CDP Login in Emulator ---
  console.log('📱 STEP 2: Login in emulator via CDP...');
  const target = await getCDPTarget();
  const wsUrl = target.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.on('open', resolve));
  await cdpCommand(ws, 'Runtime.enable');

  // Set auth token in localStorage
  await evaluateJS(ws, `
    localStorage.setItem('token', '${token1}');
    localStorage.setItem('user', JSON.stringify(${JSON.stringify(user1.data?.user || {})}));
    true
  `);

  // Navigate to chat
  await evaluateJS(ws, `window.location.hash = '/chat'; true`);
  await new Promise(r => setTimeout(r, 3000));
  console.log('  ✅ Logged in via CDP\n');

  // --- Step 3: Test Status — Photo ---
  console.log('📸 STEP 3: Test PHOTO status...');
  try {
    const imgResult = await apiPost('/api/advanced/status/upload', token1, {});
    // Since we can't upload a real file via API easily, test with a data URL approach
    const statusPhoto = await apiPost('/api/advanced/status', token1, {
      type: 'image',
      content: 'Test photo status from live testing',
      mediaUrl: 'https://picsum.photos/400/300',
    });
    record('Status — Photo', statusPhoto.status === 200 || statusPhoto.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${statusPhoto.status}: ${statusPhoto.data?.message || statusPhoto.data?.status?._id || 'created'}`);
  } catch (e) {
    record('Status — Photo', 'FAIL', e.message);
  }

  // --- Step 4: Test Status — Video ---
  console.log('🎬 STEP 4: Test VIDEO status...');
  try {
    const statusVideo = await apiPost('/api/advanced/status', token1, {
      type: 'video',
      content: 'Test video status from live testing',
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    });
    record('Status — Video', statusVideo.status === 200 || statusVideo.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${statusVideo.status}: ${statusVideo.data?.message || statusVideo.data?.status?._id || 'created'}`);
  } catch (e) {
    record('Status — Video', 'FAIL', e.message);
  }

  // --- Step 5: Test Status — Voice ---
  console.log('🎙️ STEP 5: Test VOICE status...');
  try {
    const statusVoice = await apiPost('/api/advanced/status', token1, {
      type: 'voice',
      content: 'https://example.com/test-voice.webm',
    });
    record('Status — Voice', statusVoice.status === 200 || statusVoice.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${statusVoice.status}: ${statusVoice.data?.message || statusVoice.data?.status?._id || 'created'}`);
  } catch (e) {
    record('Status — Voice', 'FAIL', e.message);
  }

  // --- Step 6: Test Status — Location ---
  console.log('📍 STEP 6: Test LOCATION status...');
  try {
    const statusLocation = await apiPost('/api/advanced/status', token1, {
      type: 'location',
      content: 'Dar es Salaam, Tanzania',
      locationData: {
        latitude: -6.7924,
        longitude: 39.2083,
        name: 'Dar es Salaam',
        address: 'Dar es Salaam, Tanzania',
      }
    });
    record('Status — Location', statusLocation.status === 200 || statusLocation.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${statusLocation.status}: ${statusLocation.data?.message || statusLocation.data?.status?._id || 'created'}`);
  } catch (e) {
    record('Status — Location', 'FAIL', e.message);
  }

  // --- Step 7: Verify statuses are visible ---
  console.log('\n🔍 STEP 7: Verify ALL statuses are visible to receiver...');
  try {
    const statusList = await apiGet('/api/advanced/status', token2);
    const statuses = statusList.data?.statuses || statusList.data?.data || [];
    const types = statuses.map(s => s.type);
    record('Statuses — Fetch all', statuses.length >= 4 ? 'PASS' : 'FAIL',
      `Found ${statuses.length} statuses: [${types.join(', ')}]`);
    record('Statuses — Photo visible', types.includes('image') ? 'PASS' : 'FAIL', '');
    record('Statuses — Video visible', types.includes('video') ? 'PASS' : 'FAIL', '');
    record('Statuses — Voice visible', types.includes('voice') ? 'PASS' : 'FAIL', '');
    record('Statuses — Location visible', types.includes('location') ? 'PASS' : 'FAIL', '');
  } catch (e) {
    record('Statuses — Fetch all', 'FAIL', e.message);
  }

  // --- Step 8: Test CHAT — Create conversation ---
  console.log('\n💬 STEP 8: Test CHAT — Send messages...');
  let convId;
  try {
    const conv = await apiPost('/api/chat/conversations', token1, {
      participants: [userId2]
    });
    convId = conv.data?.data?._id || conv.data?._id || conv.data?.conversation?._id;
    record('Chat — Create conversation', convId ? 'PASS' : 'FAIL',
      convId ? `ID: ${convId}` : JSON.stringify(conv.data).substring(0, 150));
  } catch (e) {
    record('Chat — Create conversation', 'FAIL', e.message);
  }

  // --- Step 9: Test TEXT message ---
  console.log('📝 STEP 9: Test TEXT message...');
  try {
    const msg = await apiPost('/api/chat/messages', token1, {
      conversationId: convId,
      content: 'Hello from live testing! 🎉',
      type: 'text'
    });
    record('Chat — Text message', msg.status === 200 || msg.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${msg.status}: ${msg.data?.message?._id || 'sent'}`);
  } catch (e) {
    record('Chat — Text message', 'FAIL', e.message);
  }

  // --- Step 10: Test MEDIA message (image) ---
  console.log('🖼️ STEP 10: Test MEDIA message (image)...');
  try {
    const msg = await apiPost('/api/chat/messages', token1, {
      conversationId: convId,
      content: 'Check out this image!',
      type: 'image',
      mediaUrl: 'https://picsum.photos/400/300'
    });
    record('Chat — Image message', msg.status === 200 || msg.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${msg.status}: ${msg.data?.message?._id || 'sent'}`);
  } catch (e) {
    record('Chat — Image message', 'FAIL', e.message);
  }

  // --- Step 11: Test MEDIA message (video) ---
  console.log('🎥 STEP 11: Test MEDIA message (video)...');
  try {
    const msg = await apiPost('/api/chat/messages', token1, {
      conversationId: convId,
      content: 'Check out this video!',
      type: 'video',
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
    });
    record('Chat — Video message', msg.status === 200 || msg.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${msg.status}: ${msg.data?.message?._id || 'sent'}`);
  } catch (e) {
    record('Chat — Video message', 'FAIL', e.message);
  }

  // --- Step 12: Test VOICE message ---
  console.log('🎤 STEP 12: Test VOICE message...');
  try {
    const msg = await apiPost('/api/chat/messages', token1, {
      conversationId: convId,
      content: 'https://example.com/test-voice-note.webm',
      type: 'audio',
      isVoiceNote: true
    });
    record('Chat — Voice message', msg.status === 200 || msg.status === 201 ? 'PASS' : 'FAIL',
      `HTTP ${msg.status}: ${msg.data?.message?._id || 'sent'}`);
  } catch (e) {
    record('Chat — Voice message', 'FAIL', e.message);
  }

  // --- Step 13: Test MEDIA upload endpoint directly ---
  console.log('📤 STEP 13: Test media upload endpoint...');
  try {
    // Create a tiny test image
    const testImg = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const boundary = '----TestBoundary' + Date.now();
    const crlf = '\r\n';
    const parts = [];
    parts.push(`--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="test.png"${crlf}Content-Type: image/png${crlf}${crlf}`);
    parts.push(testImg);
    parts.push(`${crlf}--${boundary}--${crlf}`);
    const body = Buffer.concat([Buffer.from(parts[0]), testImg, Buffer.from(parts[1] || parts[parts.length-1])]);
    
    // Try via fetch in CDP context
    const uploadResult = await evaluateJS(ws, `
      (async () => {
        try {
          const resp = await fetch('${API_BASE}/api/media/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ${token1}' },
            body: (() => {
              const fd = new FormData();
              const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
              const blob = new Blob([bytes], { type: 'image/png' });
              fd.append('file', blob, 'test.png');
              return fd;
            })()
          });
          const data = await resp.json();
          return JSON.stringify({ status: resp.status, url: data?.url || data?.data?.url || 'none' });
        } catch(e) { return JSON.stringify({ error: e.message }); }
      })()
    `);
    const uploadData = JSON.parse(uploadResult || '{}');
    record('Chat — Media upload', !uploadData.error && (uploadData.status === 200 || uploadData.status === 201) ? 'PASS' : 'FAIL',
      uploadData.url || uploadData.error || `HTTP ${uploadData.status}`);
  } catch (e) {
    record('Chat — Media upload', 'FAIL', e.message);
  }

  // --- Step 14: Verify messages received by user2 ---
  console.log('\n📨 STEP 14: Verify messages received by user2...');
  try {
    const msgs = await apiGet(`/api/chat/messages/${convId}?limit=10`, token2);
    const messages = msgs.data?.messages || msgs.data?.data || [];
    const types = messages.map(m => m.type);
    record('Messages — Fetch all', messages.length >= 4 ? 'PASS' : 'FAIL',
      `Found ${messages.length} messages: [${types.join(', ')}]`);
    record('Messages — Text received', types.includes('text') ? 'PASS' : 'FAIL', '');
    record('Messages — Image received', types.includes('image') ? 'PASS' : 'FAIL', '');
    record('Messages — Video received', types.includes('video') ? 'PASS' : 'FAIL', '');
    record('Messages — Audio/Voice received', types.includes('audio') ? 'PASS' : 'FAIL', '');
  } catch (e) {
    record('Messages — Fetch all', 'FAIL', e.message);
  }

  // --- Step 15: Verify in emulator UI ---
  console.log('\n📱 STEP 15: Verify emulator renders correctly...');
  try {
    // Check what's visible in the WebView
    const pageContent = await evaluateJS(ws, `
      JSON.stringify({
        url: window.location.href,
        hasChat: !!document.querySelector('[class*="chat"],[class*="message"],[data-testid*="chat"]'),
        bodyText: document.body?.innerText?.substring(0, 500) || 'empty',
        hasImages: document.querySelectorAll('img').length,
        hasVideos: document.querySelectorAll('video').length,
      })
    `);
    const uiState = JSON.parse(pageContent || '{}');
    record('Emulator — Page loaded', uiState.url ? 'PASS' : 'FAIL', `URL: ${uiState.url}`);
    record('Emulator — Has content', uiState.bodyText !== 'empty' ? 'PASS' : 'FAIL',
      `${uiState.bodyText.substring(0, 100)}...`);
  } catch (e) {
    record('Emulator — Render check', 'FAIL', e.message);
  }

  // Take screenshot via ADB
  try {
    adb('shell screencap -p /sdcard/live-test-screenshot.png');
    const localPath = path.join(process.cwd(), '.livetest', 'live-test-screenshot.png');
    execSync(`adb -s ${EMU} pull /sdcard/live-test-screenshot.png ${localPath}`, { timeout: 10000 });
    record('Emulator — Screenshot', 'PASS', `Saved to ${localPath}`);
  } catch (e) {
    record('Emulator — Screenshot', 'FAIL', e.message);
  }

  // Close CDP
  ws.close();

  // ===== SUMMARY =====
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`  Total: ${results.length} | ✅ PASS: ${passed} | ❌ FAIL: ${failed} | ⚠️ WARN: ${warnings}\n`);

  if (failed > 0) {
    console.log('  ❌ FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    - ${r.name}: ${r.detail}`);
    });
  }

  console.log('\n  ✅ ALL PASSING:');
  results.filter(r => r.status === 'PASS').forEach(r => {
    console.log(`    - ${r.name}`);
  });

  console.log('\n═══════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('❌ FATAL ERROR:', e);
  process.exit(1);
});
