// CDP test script — interacts with the Android WebView via Chrome DevTools Protocol
const http = require('http');
const API_BASE = 'http://10.0.2.2:5000'; // emulator -> host backend
const WebSocket = require(require('path').join(process.cwd(), '..', 'frontend', 'node_modules', 'ws'));

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function cdpEval(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const send = (method, params = {}) => {
      msgId++;
      ws.send(JSON.stringify({ id: msgId, method, params }));
      return msgId;
    };
    const pending = {};
    
    ws.on('open', () => {
      send('Runtime.enable');
      setTimeout(() => {
        send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      }, 300);
    });
    
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === 2) {
        resolve(msg.result?.result?.value ?? msg.result);
        ws.close();
      }
      if (msg.error) {
        reject(new Error(`CDP error: ${msg.error.message}`));
        ws.close();
      }
    });
    
    ws.on('error', reject);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout 15s')); }, 15000);
  });
}

async function main() {
  const targets = await getTargets();
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page found'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('✅ Connected to WebView:', page.url);

  // ── STEP 1: Check page state ──
  console.log('\n━━━ STEP 1: PAGE STATE ━━━');
  const state = JSON.parse(await cdpEval(wsUrl, `
    JSON.stringify({
      url: location.href,
      bodyLen: document.body?.innerText?.length || 0,
      firstText: document.body?.innerText?.substring(0, 200),
      inputs: document.querySelectorAll('input').length,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
    })
  `));
  console.log('URL:', state.url);
  console.log('Body text preview:', state.firstText?.substring(0, 150));
  console.log('Inputs:', state.inputs);
  console.log('Buttons:', state.buttons);

  // ── STEP 2: Login via API + token injection ──
  console.log('\n━━━ STEP 2: LOGIN ━━━');
  const loginResult = JSON.parse(await cdpEval(wsUrl, `
    (async () => {
      try {
        const res = await fetch('${API_BASE}/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'testuser1', password: 'TestPass123!@#' })
        });
        const data = await res.json();
        if (!data.success) return JSON.stringify({ ok: false, error: data.message });
        
        localStorage.setItem('genz_token', data.token);
        localStorage.setItem('genz_refresh_token', data.refreshToken);
        localStorage.setItem('genz_user', JSON.stringify(data.user));
        return JSON.stringify({ ok: true, user: data.user?.username });
      } catch(e) {
        return JSON.stringify({ ok: false, error: e.message });
      }
    })()
  `));
  console.log('Login:', loginResult);

  if (loginResult.ok) {
    // Navigate to chat
    await cdpEval(wsUrl, `window.location.href = '/chat'`);
    console.log('Navigating to /chat...');
    await new Promise(r => setTimeout(r, 5000));

    // Check chat page
    const chatState = JSON.parse(await cdpEval(wsUrl, `
      JSON.stringify({
        url: location.href,
        bodyLen: document.body?.innerText?.length || 0,
        preview: document.body?.innerText?.substring(0, 300),
        hasSocket: typeof io !== 'undefined',
      })
    `));
    console.log('\n━━━ STEP 3: CHAT PAGE ━━━');
    console.log('URL:', chatState.url);
    console.log('Content preview:', chatState.preview?.substring(0, 200));

    // ── STEP 4: Test Status creation ──
    console.log('\n━━━ STEP 4: TEST STATUS CREATION ━━━');
    
    // 4a: Text status
    const textStatus = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        const res = await fetch('${API_BASE}/api/advanced/status', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', content: 'Habari za CDP test! 🔥', backgroundColor: '#00a884', textColor: '#ffffff' })
        });
        const data = await res.json();
        return JSON.stringify({ type: 'text', success: data.success, id: data.status?._id });
      })()
    `));
    console.log('Text status:', textStatus);

    // 4b: Location status
    const locStatus = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        const res = await fetch('${API_BASE}/api/advanced/status', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'location', content: 'Niko Dar es Salaam 📍', locationData: { lat: -6.7924, lng: 39.2083, name: 'Dar es Salaam' } })
        });
        const data = await res.json();
        return JSON.stringify({ type: 'location', success: data.success });
      })()
    `));
    console.log('Location status:', locStatus);

    // 4c: Upload + Image status
    const imgStatus = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        // Create a test blob
        const canvas = document.createElement('canvas');
        canvas.width = 100; canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00a884';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('TEST', 25, 55);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const formData = new FormData();
        formData.append('file', blob, 'test-image.png');
        
        const uploadRes = await fetch('${API_BASE}/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) return JSON.stringify({ type: 'image', success: false, error: uploadData.message });
        
        const statusRes = await fetch('${API_BASE}/api/advanced/status', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', content: 'Picha ya CDP test 📸', mediaUrl: uploadData.fileUrl, mediaType: 'image/png' })
        });
        const statusData = await statusRes.json();
        return JSON.stringify({ type: 'image', success: statusData.success, uploadUrl: uploadData.fileUrl?.substring(0, 60) });
      })()
    `));
    console.log('Image status:', imgStatus);

    // ── STEP 5: Verify statuses ──
    console.log('\n━━━ STEP 5: VERIFY STATUSES ━━━');
    const verifyStatuses = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        const res = await fetch('${API_BASE}/api/advanced/status', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const statuses = data.statuses || [];
        return JSON.stringify({
          count: statuses.length,
          types: statuses.map(s => ({ type: s.type, content: s.content?.substring(0, 30) }))
        });
      })()
    `));
    console.log('Statuses:', verifyStatuses.count, 'total');
    verifyStatuses.types?.forEach(s => console.log(`  ${s.type}: ${s.content}`));

    // ── STEP 6: Test Voice Note (WAV upload + send) ──
    console.log('\n━━━ STEP 6: TEST VOICE MESSAGE ━━━');
    const voiceResult = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        // Create WAV blob
        const sampleRate = 8000;
        const duration = 0.1;
        const numSamples = sampleRate * duration;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);
        // WAV header
        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);
        for (let i = 0; i < numSamples; i++) view.setInt16(44 + i * 2, Math.sin(i * 0.1) * 16000, true);
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', blob, 'voice-note.wav');
        
        const uploadRes = await fetch('${API_BASE}/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        const uploadData = await uploadRes.json();
        return JSON.stringify({ voiceUpload: uploadData.success ? 'PASS' : 'FAIL: ' + uploadData.message, url: uploadData.fileUrl?.substring(0, 60) });
      })()
    `));
    console.log('Voice upload:', voiceResult);

    // ── STEP 7: Test WINGA product ──
    console.log('\n━━━ STEP 7: TEST WINGA PRODUCT ━━━');
    const wingaResult = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        // Create product image
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText('BIDHAA', 60, 100);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const formData = new FormData();
        formData.append('file', blob, 'product.png');
        
        const uploadRes = await fetch('${API_BASE}/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) return JSON.stringify({ winga: 'FAIL upload: ' + uploadData.message });
        
        const prodRes = await fetch('${API_BASE}/api/products', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Bidhaa CDP', price: 15000, description: 'Test product kwa CDP', image: uploadData.fileUrl })
        });
        const prodData = await prodRes.json();
        
        // Verify
        const listRes = await fetch('${API_BASE}/api/products', { headers: { 'Authorization': 'Bearer ' + token } });
        const listData = await listRes.json();
        
        return JSON.stringify({ 
          winga: prodData.success ? 'PASS' : 'FAIL: ' + prodData.message,
          totalProducts: listData.products?.length || 0,
          lastProduct: listData.products?.[0]?.name
        });
      })()
    `));
    console.log('WINGA:', wingaResult);

    // ── STEP 8: Test Voice Status via API ──
    console.log('\n━━━ STEP 8: TEST VOICE STATUS ━━━');
    const voiceStatus = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        // Upload voice via WAV
        const sampleRate = 8000;
        const numSamples = sampleRate * 0.1;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);
        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true); writeStr(8, 'WAVE');
        writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
        view.setUint16(34, 16, true); writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);
        for (let i = 0; i < numSamples; i++) view.setInt16(44 + i * 2, Math.sin(i * 0.1) * 16000, true);
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', blob, 'voice-status.wav');
        
        const uploadRes = await fetch('${API_BASE}/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) return JSON.stringify({ voiceStatus: 'FAIL upload: ' + uploadData.message });
        
        const statusRes = await fetch('${API_BASE}/api/advanced/status', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'voice', content: 'Voice status CDP 🎤', mediaUrl: uploadData.fileUrl, mediaType: 'audio/wav' })
        });
        const statusData = await statusRes.json();
        return JSON.stringify({ voiceStatus: statusData.success ? 'PASS' : 'FAIL: ' + statusData.message });
      })()
    `));
    console.log('Voice status:', voiceStatus);

    // ── STEP 9: Test Music Status ──
    console.log('\n━━━ STEP 9: TEST MUSIC STATUS ━━━');
    const musicStatus = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        // Upload audio
        const sampleRate = 8000;
        const numSamples = sampleRate * 0.1;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);
        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true); writeStr(8, 'WAVE');
        writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
        view.setUint16(34, 16, true); writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);
        for (let i = 0; i < numSamples; i++) view.setInt16(44 + i * 2, Math.sin(i * 0.1) * 16000, true);
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', blob, 'music-status.wav');
        
        const uploadRes = await fetch('${API_BASE}/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) return JSON.stringify({ musicStatus: 'FAIL upload: ' + uploadData.message });
        
        const statusRes = await fetch('${API_BASE}/api/advanced/status', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'music', content: 'Muziki CDP 🎵', mediaUrl: uploadData.fileUrl, mediaType: 'audio/wav' })
        });
        const statusData = await statusRes.json();
        return JSON.stringify({ musicStatus: statusData.success ? 'PASS' : 'FAIL: ' + statusData.message });
      })()
    `));
    console.log('Music status:', musicStatus);

    // ── FINAL: Summary ──
    console.log('\n━━━ FINAL VERIFICATION ━━━');
    const finalVerify = JSON.parse(await cdpEval(wsUrl, `
      (async () => {
        const token = localStorage.getItem('genz_token');
        const [statusRes, prodRes] = await Promise.all([
          fetch('${API_BASE}/api/advanced/status', { headers: { 'Authorization': 'Bearer ' + token } }),
          fetch('${API_BASE}/api/products', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);
        const statusData = await statusRes.json();
        const prodData = await prodRes.json();
        return JSON.stringify({
          totalStatuses: statusData.statuses?.length || 0,
          statusTypes: [...new Set((statusData.statuses || []).map(s => s.type))],
          totalProducts: prodData.products?.length || 0
        });
      })()
    `));
    console.log('Total statuses:', finalVerify.totalStatuses);
    console.log('Status types:', finalVerify.statusTypes?.join(', '));
    console.log('Total products:', finalVerify.totalProducts);
  }

  process.exit(0);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
