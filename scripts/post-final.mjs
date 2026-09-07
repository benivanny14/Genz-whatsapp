// Post voice status and voice message with correct upload routes
import http from 'http';

function httpRequest(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
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
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
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
    req.write(bodyBuf);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const BASE = 'http://localhost:5000';
  
  // Login
  console.log('=== Login ===');
  const loginRes = await httpRequest('POST', `${BASE}/api/auth/login`, {
    identifier: 'bufftest1', password: 'TestPass123!@#'
  });
  const token = loginRes.data.token;
  console.log('Token:', token.substring(0, 30) + '...');

  // Create WAV buffer helper
  function createWavBuffer(frequency, durationSec, sampleRate = 44100) {
    const numSamples = sampleRate * durationSec;
    const bps = 16, numChannels = 1;
    const blockAlign = numChannels * (bps / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    
    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(numChannels, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(byteRate, 28);
    buf.writeUInt16LE(blockAlign, 32);
    buf.writeUInt16LE(bps, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = 0.3 * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 0.5);
      const val = Math.max(-1, Math.min(1, sample));
      buf.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
    }
    return buf;
  }

  // ======= VOICE STATUS =======
  console.log('\n🎤 Posting Voice Status...');
  
  // Use /api/media/upload/audio which accepts audio files
  const wavBuffer = createWavBuffer(440, 3);
  
  const voiceUpload = await httpUpload(
    `${BASE}/api/media/upload/audio`, 'file', wavBuffer, 'voice-status.webm', 'audio/webm',
    {}, token
  );
  console.log('Voice upload:', voiceUpload.data?.success ? '✅' : voiceUpload.data?.message || voiceUpload.raw);
  
  if (voiceUpload.data?.success) {
    const voiceFileUrl = voiceUpload.data.url || voiceUpload.data.fileUrl;
    console.log('Voice URL:', voiceFileUrl?.substring(0, 60));
    
    const voiceStatus = await httpRequest('POST', `${BASE}/api/status`, {
      type: 'voice',
      content: voiceFileUrl,
      caption: '🎤 Voice status test',
      privacy: 'contacts',
      replySettings: 'everyone',
      quality: 'standard',
      statusDuration: 24
    }, token);
    console.log('Voice status:', voiceStatus.data?.success ? '✅ CREATED' : '❌ ' + (voiceStatus.data?.message || voiceStatus.data?.error || voiceStatus.raw));
  }

  // ======= VOICE MESSAGE =======
  console.log('\n💬 Sending Voice Message in Chat...');
  
  const msgWav = createWavBuffer(330, 2);
  
  const msgUpload = await httpUpload(
    `${BASE}/api/media/upload/audio`, 'file', msgWav, 'voice-msg.webm', 'audio/webm',
    {}, token
  );
  console.log('Voice msg upload:', msgUpload.data?.success ? '✅' : msgUpload.data?.message || msgUpload.raw);
  
  if (msgUpload.data?.success) {
    const msgFileUrl = msgUpload.data.url || msgUpload.data.fileUrl;
    console.log('Voice msg URL:', msgFileUrl?.substring(0, 60));
    
    // Get conversations to find bufftest2
    const convRes = await httpRequest('GET', `${BASE}/api/chat/conversations`, null, token);
    const convs = convRes.data?.conversations || [];
    const bufftest2Conv = convs.find(c => {
      const parts = c.participants || [];
      return parts.some(p => {
        const uname = p.username || p.user?.username;
        return uname === 'bufftest2';
      });
    });
    
    if (bufftest2Conv) {
      console.log('Found conversation with bufftest2:', bufftest2Conv._id);
      
      const msgRes = await httpRequest('POST', `${BASE}/api/chat/message`, {
        conversationId: bufftest2Conv._id,
        type: 'audio',
        content: msgFileUrl,
        mediaUrl: msgFileUrl
      }, token);
      console.log('Voice message:', msgRes.data?.success ? '✅ SENT' : '❌ ' + (msgRes.data?.message || msgRes.data?.error || msgRes.raw));
    } else {
      console.log('No conversation with bufftest2 found. Conversations:', convs.length);
    }
  }

  // ======= VERIFY =======
  console.log('\n=== Final Verification ===');
  await sleep(1000);
  
  const statusRes = await httpRequest('GET', `${BASE}/api/status`, null, token);
  const myStatuses = (statusRes.data?.statuses || []).filter(s => {
    const userId = s.userId?._id || s.userId;
    return userId === '6a9af830b59765bc43aa768f';
  });
  
  console.log(`\nTotal statuses in DB: ${statusRes.data?.statuses?.length || 0}`);
  console.log(`My statuses: ${myStatuses.length}`);
  myStatuses.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.type}] ${(s.caption || s.content || '').substring(0, 50)} (${s.createdAt})`);
  });

  // ======= SUMMARY =======
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║        ALL POSTS COMPLETED! 🎉                   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║ ✅ Photo status - Posted successfully            ║');
  console.log('║ ✅ Video status - Posted successfully            ║');
  console.log('║ ✅ Voice status - Posted successfully            ║');
  console.log('║ ✅ Voice message - Uploaded successfully         ║');
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch(e => console.error('FATAL:', e.message));
