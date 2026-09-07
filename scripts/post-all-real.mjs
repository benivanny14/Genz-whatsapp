// Post all statuses using proper CDP approach
import http from 'http';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

let wsId = 0;
function cdpEval(wsUrl, expr) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const myId = ++wsId;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: myId,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === myId) { ws.close(); resolve(msg.result?.result?.value); }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 45000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  // Get token from localStorage
  const token = await cdpEval(wsUrl, `
    (() => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      return t || 'NO_TOKEN';
    })()
  `);
  console.log('Token:', token.substring(0, 30) + '...');
  
  if (token === 'NO_TOKEN') {
    console.error('Not logged in - no token found');
    process.exit(1);
  }

  // Store token globally for all requests
  await cdpEval(wsUrl, `window.__TEST_TOKEN = ${JSON.stringify(token)}`);

  // ======== PHOTO STATUS ========
  console.log('\n📸 Posting Photo Status...');
  const photoResult = await cdpEval(wsUrl, `
    (async () => {
      const token = window.__TEST_TOKEN;
      
      // Create test image
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.5, '#4ecdc4');
      grad.addColorStop(1, '#45b7d1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Photo Status', 200, 190);
      ctx.font = '18px sans-serif';
      ctx.fillText(new Date().toLocaleTimeString(), 200, 230);
      
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      
      // Upload
      const fd = new FormData();
      fd.append('file', blob, 'photo.png');
      const upRes = await fetch('/api/status/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd
      });
      const upData = await upRes.json();
      if (!upData.success) return 'UPLOAD_ERR: ' + JSON.stringify(upData);
      
      // Create status
      const stRes = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          type: 'image',
          content: upData.fileUrl,
          caption: 'Photo status from test',
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const stData = await stRes.json();
      return stData.success ? 'PHOTO_OK: ' + stData.status?._id : 'STATUS_ERR: ' + JSON.stringify(stData);
    })()
  `);
  console.log(photoResult);

  // ======== VIDEO STATUS ========
  console.log('\n🎬 Posting Video Status...');
  const videoResult = await cdpEval(wsUrl, `
    (async () => {
      const token = window.__TEST_TOKEN;
      
      // Create video using canvas + MediaRecorder
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 320, 240);
      grad.addColorStop(0, '#667eea');
      grad.addColorStop(1, '#764ba2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Video Status', 160, 120);
      
      const stream = canvas.captureStream(1);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      
      return new Promise(resolve => {
        rec.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          
          const fd = new FormData();
          fd.append('file', blob, 'video.webm');
          const upRes = await fetch('/api/status/upload', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: fd
          });
          const upData = await upRes.json();
          if (!upData.success) { resolve('UPLOAD_ERR: ' + JSON.stringify(upData)); return; }
          
          const stRes = await fetch('/api/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
              type: 'video',
              content: upData.fileUrl,
              caption: 'Video status from test',
              privacy: 'contacts',
              replySettings: 'everyone',
              quality: 'standard',
              statusDuration: 24
            })
          });
          const stData = await stRes.json();
          resolve(stData.success ? 'VIDEO_OK: ' + stData.status?._id : 'STATUS_ERR: ' + JSON.stringify(stData));
        };
        rec.start();
        setTimeout(() => rec.stop(), 1500);
      });
    })()
  `);
  console.log(videoResult);

  // ======== VOICE STATUS ========
  console.log('\n🎤 Posting Voice Status...');
  const voiceResult = await cdpEval(wsUrl, `
    (async () => {
      const token = window.__TEST_TOKEN;
      
      // Generate synthetic audio
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const sr = ctx.sampleRate;
      const dur = 3;
      const len = sr * dur;
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        d[i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 0.5)
             + 0.15 * Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 0.8);
      }
      
      // WAV encoding
      const bps = 2, ba = bps, br = sr * ba, ds = len * ba;
      const ab = new ArrayBuffer(44 + ds);
      const v = new DataView(ab);
      const ws2 = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      ws2(0, 'RIFF'); v.setUint32(4, 36 + ds, true); ws2(8, 'WAVE'); ws2(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, br, true); v.setUint16(32, ba, true);
      v.setUint16(34, 16, true); ws2(36, 'data'); v.setUint32(40, ds, true);
      let off = 44;
      for (let i = 0; i < len; i++) {
        const s = Math.max(-1, Math.min(1, d[i]));
        v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
      }
      
      const blob = new Blob([ab], { type: 'audio/wav' });
      
      // Upload
      const fd = new FormData();
      fd.append('file', blob, 'voice.wav');
      const upRes = await fetch('/api/status/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd
      });
      const upData = await upRes.json();
      if (!upData.success) return 'UPLOAD_ERR: ' + JSON.stringify(upData);
      
      // Create voice status
      const stRes = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          type: 'voice',
          content: upData.fileUrl,
          caption: 'Voice status from test',
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const stData = await stRes.json();
      return stData.success ? 'VOICE_OK: ' + stData.status?._id : 'STATUS_ERR: ' + JSON.stringify(stData);
    })()
  `);
  console.log(voiceResult);

  // ======== VOICE MESSAGE IN CHAT ========
  console.log('\n💬 Sending Voice Message in Chat...');
  await cdpEval(wsUrl, `window.location.hash = '/chat'`);
  await sleep(3000);
  
  // Click on bufftest2 conversation
  await cdpEval(wsUrl, `
    (async () => {
      const els = [...document.querySelectorAll('*')];
      const conv = els.find(el => (el.textContent || '').includes('bufftest2') && el.getAttribute('role') !== 'tab');
      if (conv) { conv.click(); await new Promise(r => setTimeout(r, 2000)); }
    })()
  `);
  await sleep(2000);

  const voiceMsgResult = await cdpEval(wsUrl, `
    (async () => {
      const token = window.__TEST_TOKEN;
      
      // Create audio blob
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const sr = ctx.sampleRate;
      const dur = 2;
      const len = sr * dur;
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        d[i] = 0.4 * Math.sin(2 * Math.PI * 330 * t) * (1 - t / dur);
      }
      
      const bps = 2, ba = bps, br = sr * ba, ds = len * ba;
      const ab = new ArrayBuffer(44 + ds);
      const v = new DataView(ab);
      const ws2 = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      ws2(0, 'RIFF'); v.setUint32(4, 36 + ds, true); ws2(8, 'WAVE'); ws2(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, br, true); v.setUint16(32, ba, true);
      v.setUint16(34, 16, true); ws2(36, 'data'); v.setUint32(40, ds, true);
      let off = 44;
      for (let i = 0; i < len; i++) {
        const s = Math.max(-1, Math.min(1, d[i]));
        v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
      }
      
      const blob = new Blob([ab], { type: 'audio/wav' });
      
      // Upload voice message
      const fd = new FormData();
      fd.append('file', blob, 'voice-msg.wav');
      fd.append('type', 'audio');
      
      const upRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd
      });
      const upData = await upRes.json();
      if (!upData.success) return 'UPLOAD_ERR: ' + JSON.stringify(upData);
      
      // Get current chat user (bufftest2)
      const chatUrl = location.href;
      const convId = chatUrl.split('/chat/')[1] || '';
      
      // Send message via API
      const msgRes = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          conversationId: convId,
          type: 'audio',
          content: upData.fileUrl || upData.url,
          mediaUrl: upData.fileUrl || upData.url
        })
      });
      const msgData = await msgRes.json();
      return msgData.success ? 'VOICE_MSG_SENT: ' + (msgData.message?._id || 'ok') : 'MSG_ERR: ' + JSON.stringify(msgData);
    })()
  `);
  console.log(voiceMsgResult);

  // ======== VERIFY ========
  console.log('\n✅ Verifying all posts...');
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(3000);
  
  const pageState = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 600)`);
  console.log('\nStatus page:', pageState);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  TEST RESULTS:');
  console.log('  📸 Photo Status:', photoResult?.includes('OK') ? '✅ Posted' : '❌ ' + photoResult);
  console.log('  🎬 Video Status:', videoResult?.includes('OK') ? '✅ Posted' : '❌ ' + videoResult);
  console.log('  🎤 Voice Status:', voiceResult?.includes('OK') ? '✅ Posted' : '❌ ' + voiceResult);
  console.log('  💬 Voice Message:', voiceMsgResult?.includes('SENT') ? '✅ Sent' : '❌ ' + voiceMsgResult);
  console.log('═══════════════════════════════════════════════');
}

main().catch(e => console.error('FATAL:', e.message));
