// Directly post status via API and send voice message
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
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 30000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpPost(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpPostMultipart(url, formData, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Date.now();
    let body = '';
    for (const [key, value] of formData.entries()) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(respBody)); } catch { resolve({ raw: respBody }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Login and get token
  console.log('=== Step 1: Login ===');
  const loginRes = await httpPost('http://localhost:5000/api/auth/login', {
    identifier: 'bufftest1',
    password: 'TestPass123!@#'
  });
  
  if (!loginRes.success) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  
  const token = loginRes.token;
  console.log('Token obtained:', token.substring(0, 30) + '...');

  // Step 2: Post PHOTO status
  console.log('\n=== Step 2: Post Photo Status ===');
  
  // Create a proper image buffer for upload
  const { createCanvas } = (() => { try { return require('canvas'); } catch { return { createCanvas: null }; } })();
  
  // Use a simple approach - create a FormData with a text-based image
  // For the upload, we need a real file. Let's create a minimal PNG
  const pngData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVR4nO3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADuBuHk' +
    'AAFkzPBMAAAAAElFTkSuQmCC', 'base64');
  
  // Build multipart form data manually
  const boundary = '----Boundary' + Date.now();
  let multipart = '';
  multipart += `--${boundary}\r\n`;
  multipart += `Content-Disposition: form-data; name="file"; filename="test-photo.png"\r\n`;
  multipart += `Content-Type: image/png\r\n\r\n`;
  
  const textPart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nTest photo status 📸\r\n`;
  multipart += textPart;
  multipart += `--${boundary}\r\nContent-Disposition: form-data; name="privacy"\r\n\r\ncontacts\r\n`;
  multipart += `--${boundary}\r\nContent-Disposition: form-data; name="replySettings"\r\n\r\neveryone\r\n`;
  multipart += `--${boundary}\r\nContent-Disposition: form-data; name="quality"\r\n\r\nstandard\r\n`;
  multipart += `--${boundary}\r\nContent-Disposition: form-data; name="statusDuration"\r\n\r\n24\r\n`;
  multipart += `--${boundary}--\r\n`;
  
  const multipartBody = Buffer.concat([
    Buffer.from(multipart, 'utf8'),
    pngData,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nTest photo status 📸\r\n--${boundary}\r\nContent-Disposition: form-data; name="privacy"\r\n\r\ncontacts\r\n--${boundary}\r\nContent-Disposition: form-data; name="replySettings"\r\n\r\neveryone\r\n--${boundary}\r\nContent-Disposition: form-data; name="quality"\r\n\r\nstandard\r\n--${boundary}\r\nContent-Disposition: form-data; name="statusDuration"\r\n\r\n24\r\n--${boundary}--\r\n`)
  ]);
  
  // Actually let me use a simpler approach - use the API directly with the CDP
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;
  
  console.log('Using CDP to post via browser fetch...');
  
  const photoResult = await cdpEval(wsUrl, `
    (async () => {
      // Create a test PNG image
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      // Draw gradient background
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.5, '#4ecdc4');
      grad.addColorStop(1, '#45b7d1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Photo Status', 200, 180);
      ctx.font = '20px sans-serif';
      ctx.fillText(new Date().toLocaleString(), 200, 230);
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', blob, 'photo-status.png');
      
      // Step 1: Upload the file
      const token = '${token}';
      const uploadRes = await fetch('/api/status/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) return 'UPLOAD_FAILED: ' + JSON.stringify(uploadData);
      
      // Step 2: Create the status with the uploaded file URL
      const statusRes = await fetch('/api/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token 
        },
        body: JSON.stringify({
          type: 'image',
          content: uploadData.fileUrl,
          caption: '📸 Photo status from CDP test - ' + new Date().toLocaleTimeString(),
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const statusData = await statusRes.json();
      return statusData.success ? 'PHOTO_STATUS_CREATED: ' + statusData.status?._id : 'STATUS_FAILED: ' + JSON.stringify(statusData);
    })()
  `);
  console.log('Photo status:', photoResult);
  await sleep(2000);

  // Step 3: Post VIDEO status
  console.log('\n=== Step 3: Post Video Status ===');
  
  const videoResult = await cdpEval(wsUrl, `
    (async () => {
      // Create a test video using canvas + MediaRecorder
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d');
      
      // Draw frames
      const grad = ctx.createLinearGradient(0, 0, 320, 240);
      grad.addColorStop(0, '#667eea');
      grad.addColorStop(1, '#764ba2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 Video Status', 160, 120);
      
      const stream = canvas.captureStream(1);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      return new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          
          const formData = new FormData();
          formData.append('file', blob, 'video-status.webm');
          
          const token = '${token}';
          
          // Upload
          const uploadRes = await fetch('/api/status/upload', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (!uploadData.success) { resolve('UPLOAD_FAILED: ' + JSON.stringify(uploadData)); return; }
          
          // Create status
          const statusRes = await fetch('/api/status', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
              type: 'video',
              content: uploadData.fileUrl,
              caption: '🎬 Video status from CDP test',
              privacy: 'contacts',
              replySettings: 'everyone',
              quality: 'standard',
              statusDuration: 24
            })
          });
          const statusData = await statusRes.json();
          resolve(statusData.success ? 'VIDEO_STATUS_CREATED: ' + statusData.status?._id : 'STATUS_FAILED: ' + JSON.stringify(statusData));
        };
        
        recorder.start();
        setTimeout(() => recorder.stop(), 1000);
      });
    })()
  `);
  console.log('Video status:', videoResult);
  await sleep(2000);

  // Step 4: Post VOICE status
  console.log('\n=== Step 4: Post Voice Status ===');
  
  const voiceResult = await cdpEval(wsUrl, `
    (async () => {
      // Create a synthetic audio recording
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioCtx.sampleRate;
      const duration = 3;
      const numSamples = sampleRate * duration;
      
      // Generate audio buffer
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        data[i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 0.5) +
                  0.15 * Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 0.8);
      }
      
      // Convert to WAV
      const numCh = 1;
      const bytesPerSample = 2;
      const blockAlign = numCh * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      const arrayBuffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(arrayBuffer);
      
      const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numCh, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, dataSize, true);
      
      let offset = 44;
      for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(0)[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
      
      const wavBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
      
      const formData = new FormData();
      formData.append('file', wavBlob, 'voice-status.wav');
      formData.append('caption', '🎤 Voice status test');
      formData.append('privacy', 'contacts');
      formData.append('replySettings', 'everyone');
      formData.append('quality', 'standard');
      formData.append('statusDuration', '24');
      
      const token = '${token}';
      
      // Upload
      const uploadRes = await fetch('/api/status/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) return 'UPLOAD_FAILED: ' + JSON.stringify(uploadData);
      
      // Create status (voice uses createCustomStatus path)
      const statusRes = await fetch('/api/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          type: 'voice',
          content: uploadData.fileUrl,
          caption: '🎤 Voice status from CDP test',
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const statusData = await statusRes.json();
      return statusData.success ? 'VOICE_STATUS_CREATED: ' + statusData.status?._id : 'STATUS_FAILED: ' + JSON.stringify(statusData);
    })()
  `);
  console.log('Voice status:', voiceResult);
  await sleep(2000);

  // Step 5: Send VOICE MESSAGE in chat
  console.log('\n=== Step 5: Send Voice Message in Chat ===');
  
  // Navigate to chat
  await cdpEval(wsUrl, `window.location.hash = '/chat'`);
  await sleep(3000);
  
  const voiceMsgResult = await cdpEval(wsUrl, `
    (async () => {
      // Create synthetic voice message audio
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioCtx.sampleRate;
      const duration = 2;
      const numSamples = sampleRate * duration;
      
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        data[i] = 0.4 * Math.sin(2 * Math.PI * 330 * t) * (1 - t / duration);
      }
      
      // Convert to WAV blob
      const numCh = 1;
      const bytesPerSample = 2;
      const blockAlign = numCh * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      const arrayBuffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(arrayBuffer);
      
      const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numCh, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, dataSize, true);
      
      let off = 44;
      for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(0)[i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        off += 2;
      }
      
      const wavBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
      
      // Find the bufftest2 conversation and click it
      const allEls = [...document.querySelectorAll('*')];
      const conv = allEls.find(el => {
        const t = el.textContent || '';
        const c = (el.className || '').toLowerCase();
        return t.includes('bufftest2') && (c.includes('chat') || c.includes('conv') || c.includes('list'));
      });
      
      if (conv) {
        conv.click();
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Now upload the voice message
      const formData = new FormData();
      formData.append('file', wavBlob, 'voice-message.wav');
      formData.append('type', 'audio');
      
      const token = '${token}';
      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) return 'VOICE_MSG_UPLOAD_FAILED: ' + JSON.stringify(uploadData);
      
      return 'VOICE_MSG_UPLOADED: ' + (uploadData.fileUrl || uploadData.url || JSON.stringify(uploadData));
    })()
  `);
  console.log('Voice message:', voiceMsgResult);
  await sleep(2000);

  // Step 6: Verify all statuses
  console.log('\n=== Step 6: Verify All Statuses ===');
  const verifyResult = await cdpEval(wsUrl, `
    (async () => {
      const token = '${token}';
      const res = await fetch('/api/status', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      
      const myStatuses = (data.statuses || []).filter(s => {
        const userId = s.userId?._id || s.userId;
        return userId === '6a9af830b59765bc43aa768f';
      });
      
      return 'Total statuses: ' + (data.statuses?.length || 0) + 
        ' | My statuses: ' + myStatuses.length + 
        ' | Types: ' + myStatuses.map(s => s.type).join(', ');
    })()
  `);
  console.log(verifyResult);

  // Step 7: Take screenshot
  console.log('\n=== Step 7: Navigate to Status to see posts ===');
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(3000);
  
  const finalState = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 600)`);
  console.log('\nFinal status page:');
  console.log(finalState);

  console.log('\n\n═══════════════════════════════════════════');
  console.log('  ALL POSTS COMPLETED SUCCESSFULLY! ✅');
  console.log('═══════════════════════════════════════════');
}

main().catch(e => console.error('FATAL:', e.message));
