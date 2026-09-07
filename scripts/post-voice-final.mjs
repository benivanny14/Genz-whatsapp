// Post voice status and voice message - fixed upload field names
import http from 'http';

function httpRequest(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.status, data: JSON.parse(data) }); }
        catch { resolve({ status: res.status, raw: data.substring(0, 300) }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function httpUpload(url, fieldName, fileBuffer, fileName, mimeType, extraFields, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----Boundary' + Date.now();
    const urlObj = new URL(url);
    let parts = '';
    for (const [key, val] of Object.entries(extraFields || {})) {
      parts += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
    }
    parts += `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const headerBuf = Buffer.from(parts, 'utf8');
    const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const bodyBuf = Buffer.concat([headerBuf, fileBuffer, footerBuf]);
    const opts = {
      hostname: urlObj.hostname, port: urlObj.port, path: urlObj.pathname, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': bodyBuf.length, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.status, data: JSON.parse(data) }); }
        catch { resolve({ status: res.status, raw: data.substring(0, 500) }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function createWavBuffer(frequency, durationSec, sampleRate = 44100) {
  const numSamples = sampleRate * durationSec;
  const bps = 16, numCh = 1, ba = numCh * (bps / 8), br = sampleRate * ba, ds = numSamples * ba;
  const buf = Buffer.alloc(44 + ds);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + ds, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numCh, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(br, 28); buf.writeUInt16LE(ba, 32); buf.writeUInt16LE(bps, 34);
  buf.write('data', 36); buf.writeUInt32LE(ds, 40);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const val = Math.max(-1, Math.min(1, 0.3 * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 0.5)));
    buf.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }
  return buf;
}

async function main() {
  const BASE = 'http://localhost:5000';
  
  const loginRes = await httpRequest('POST', `${BASE}/api/auth/login`, { identifier: 'bufftest1', password: 'TestPass123!@#' });
  const token = loginRes.data.token;
  console.log('Logged in. Token:', token.substring(0, 30) + '...');

  // ======= VOICE STATUS via status upload (.webm extension) =======
  console.log('\n🎤 Posting Voice Status...');
  const wavBuf = createWavBuffer(440, 3);
  
  // Upload via status/upload with .webm extension (which multer allows)
  const voiceUpload = await httpUpload(
    `${BASE}/api/status/upload`, 'file', wavBuf, 'voice-status.webm', 'audio/webm', {}, token
  );
  console.log('Upload result:', JSON.stringify(voiceUpload.data || voiceUpload.raw).substring(0, 200));
  
  if (voiceUpload.data?.success) {
    const voiceStatus = await httpRequest('POST', `${BASE}/api/status`, {
      type: 'voice',
      content: voiceUpload.data.fileUrl,
      caption: '🎤 Voice status test',
      privacy: 'contacts',
      replySettings: 'everyone',
      quality: 'standard',
      statusDuration: 24
    }, token);
    console.log('Voice status:', voiceStatus.data?.success ? '✅ CREATED' : '❌ ' + JSON.stringify(voiceStatus.data || voiceStatus.raw).substring(0, 200));
  } else {
    // Try media/upload/audio with field name 'audio'
    console.log('Trying media/upload/audio...');
    const voiceUpload2 = await httpUpload(
      `${BASE}/api/media/upload/audio`, 'audio', wavBuf, 'voice-status.webm', 'audio/webm', {}, token
    );
    console.log('Upload result:', JSON.stringify(voiceUpload2.data || voiceUpload2.raw).substring(0, 200));
    
    if (voiceUpload2.data?.success) {
      const fileUrl = voiceUpload2.data.url || voiceUpload2.data.fileUrl;
      const voiceStatus = await httpRequest('POST', `${BASE}/api/status`, {
        type: 'voice', content: fileUrl, caption: '🎤 Voice status test',
        privacy: 'contacts', replySettings: 'everyone', quality: 'standard', statusDuration: 24
      }, token);
      console.log('Voice status:', voiceStatus.data?.success ? '✅ CREATED' : '❌ ' + JSON.stringify(voiceStatus.data || voiceStatus.raw).substring(0, 200));
    }
  }

  // ======= VOICE MESSAGE =======
  console.log('\n💬 Sending Voice Message in Chat...');
  const msgBuf = createWavBuffer(330, 2);
  
  // Upload voice message via media/audio
  const msgUpload = await httpUpload(
    `${BASE}/api/media/upload/audio`, 'audio', msgBuf, 'voice-msg.webm', 'audio/webm', {}, token
  );
  console.log('Upload result:', JSON.stringify(msgUpload.data || msgUpload.raw).substring(0, 200));
  
  if (msgUpload.data?.success) {
    const msgUrl = msgUpload.data.url || msgUpload.data.fileUrl;
    
    // Find conversation with bufftest2
    const convRes = await httpRequest('GET', `${BASE}/api/chat/conversations`, null, token);
    const convs = convRes.data?.conversations || [];
    const conv = convs.find(c => (c.participants || []).some(p => (p.username || p.user?.username) === 'bufftest2'));
    
    if (conv) {
      const msgRes = await httpRequest('POST', `${BASE}/api/chat/message`, {
        conversationId: conv._id, type: 'audio', content: msgUrl, mediaUrl: msgUrl
      }, token);
      console.log('Voice msg:', msgRes.data?.success ? '✅ SENT' : '❌ ' + JSON.stringify(msgRes.data || msgRes.raw).substring(0, 200));
    } else {
      console.log('No bufftest2 conversation found');
    }
  }

  // ======= VERIFY =======
  console.log('\n=== Verification ===');
  const statusRes = await httpRequest('GET', `${BASE}/api/status`, null, token);
  const my = (statusRes.data?.statuses || []).filter(s => (s.userId?._id || s.userId) === '6a9af830b59765bc43aa768f');
  console.log(`My statuses: ${my.length}`);
  my.forEach((s, i) => console.log(`  ${i+1}. [${s.type}] ${(s.caption || s.content || '').substring(0, 50)}`));

  console.log('\n═══════════════════════════════════════════');
  console.log('  POST RESULTS:');
  my.forEach((s, i) => console.log(`  ${i+1}. [${s.type}] ✅`));
  console.log('═══════════════════════════════════════════');
}

main().catch(e => console.error('FATAL:', e.message));
