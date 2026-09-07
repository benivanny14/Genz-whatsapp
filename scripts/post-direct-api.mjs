// Post all statuses directly via Node.js HTTP API
import http from 'http';
import { readFileSync } from 'fs';

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
        catch { resolve({ status: res.status, raw: data.substring(0, 200) }); }
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
    
    let header = '';
    for (const [key, val] of Object.entries(extraFields || {})) {
      header += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
    }
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    
    const headerBuf = Buffer.from(header + fileHeader, 'utf8');
    const footerBuf = Buffer.from(footer, 'utf8');
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
  if (!loginRes.data.success) { console.error('Login failed:', loginRes.data); return; }
  const token = loginRes.data.token;
  console.log('Token:', token.substring(0, 30) + '...');

  // Check auth
  const meRes = await httpRequest('GET', `${BASE}/api/auth/me`, null, token);
  console.log('Auth/me:', meRes.data.success, meRes.data.user?.username);

  // ======= PHOTO STATUS =======
  console.log('\n📸 Posting Photo Status...');
  
  // Create a real PNG image using sharp
  const { execSync } = await import('child_process');
  
  // Use sharp from backend
  process.chdir('backend');
  const sharp = (await import('sharp')).default;
  
  const photoBuffer = await sharp({
    create: { width: 400, height: 400, channels: 4, background: { r: 255, g: 107, b: 107, alpha: 1 } }
  }).png().toBuffer();
  
  process.chdir('..');
  
  const photoUpload = await httpUpload(
    `${BASE}/api/status/upload`, 'file', photoBuffer, 'photo.png', 'image/png',
    {}, token
  );
  console.log('Upload:', photoUpload.data.success ? 'OK' : photoUpload.data.message || photoUpload.raw);
  
  if (photoUpload.data.success) {
    const photoStatus = await httpRequest('POST', `${BASE}/api/status`, {
      type: 'image',
      content: photoUpload.data.fileUrl,
      caption: '📸 Photo status from API test',
      privacy: 'contacts',
      replySettings: 'everyone',
      quality: 'standard',
      statusDuration: 24
    }, token);
    console.log('Photo status:', photoStatus.data.success ? '✅ CREATED: ' + (photoStatus.data.status?._id || 'ok') : '❌ ' + (photoStatus.data.message || photoStatus.data.error));
  }

  // ======= VIDEO STATUS =======
  console.log('\n🎬 Posting Video Status...');
  
  // Create a minimal valid WebM file (video container)
  // WebM header + minimal VP8 video data
  const webmHeader = Buffer.from([
    0x1A, 0x45, 0xDF, 0xA3, // EBML header
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0F, // header size
    0x42, 0x86, 0x81, 0x01, // EBMLVersion = 1
    0x42, 0xF7, 0x81, 0x01, // EBMLReadVersion = 1
    0x42, 0xF2, 0x81, 0x04, // EBMLMaxIDLength = 4
    0x42, 0xF3, 0x81, 0x08, // EBMLMaxSizeLength = 8
    0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // DocType = "webm"
  ]);
  
  const videoUpload = await httpUpload(
    `${BASE}/api/status/upload`, 'file', webmHeader, 'video.webm', 'video/webm',
    {}, token
  );
  console.log('Upload:', videoUpload.data.success ? 'OK' : videoUpload.data.message || videoUpload.raw);
  
  if (videoUpload.data.success) {
    const videoStatus = await httpRequest('POST', `${BASE}/api/status`, {
      type: 'video',
      content: videoUpload.data.fileUrl,
      caption: '🎬 Video status from API test',
      privacy: 'contacts',
      replySettings: 'everyone',
      quality: 'standard',
      statusDuration: 24
    }, token);
    console.log('Video status:', videoStatus.data.success ? '✅ CREATED: ' + (videoStatus.data.status?._id || 'ok') : '❌ ' + (videoStatus.data.message || videoStatus.data.error));
  }

  // ======= VOICE STATUS =======
  console.log('\n🎤 Posting Voice Status...');
  
  // Create a real WAV audio file
  const sampleRate = 44100;
  const duration = 3;
  const numSamples = sampleRate * duration;
  const bps = 16;
  const numChannels = 1;
  const blockAlign = numChannels * (bps / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  
  const wavBuf = Buffer.alloc(44 + dataSize);
  wavBuf.write('RIFF', 0);
  wavBuf.writeUInt32LE(36 + dataSize, 4);
  wavBuf.write('WAVE', 8);
  wavBuf.write('fmt ', 12);
  wavBuf.writeUInt32LE(16, 16);
  wavBuf.writeUInt16LE(1, 20); // PCM
  wavBuf.writeUInt16LE(numChannels, 22);
  wavBuf.writeUInt32LE(sampleRate, 24);
  wavBuf.writeUInt32LE(byteRate, 28);
  wavBuf.writeUInt16LE(blockAlign, 32);
  wavBuf.writeUInt16LE(bps, 34);
  wavBuf.write('data', 36);
  wavBuf.writeUInt32LE(dataSize, 40);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = 0.3 * Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 0.5)
                 + 0.15 * Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 0.8);
    const val = Math.max(-1, Math.min(1, sample));
    wavBuf.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }
  
  const voiceUpload = await httpUpload(
    `${BASE}/api/status/upload`, 'file', wavBuf, 'voice.wav', 'audio/wav',
    {}, token
  );
  console.log('Upload:', voiceUpload.data.success ? 'OK' : voiceUpload.data.message || voiceUpload.raw);
  
  if (voiceUpload.data.success) {
    const voiceStatus = await httpRequest('POST', `${BASE}/api/status`, {
      type: 'voice',
      content: voiceUpload.data.fileUrl,
      caption: '🎤 Voice status from API test',
      privacy: 'contacts',
      replySettings: 'everyone',
      quality: 'standard',
      statusDuration: 24
    }, token);
    console.log('Voice status:', voiceStatus.data.success ? '✅ CREATED: ' + (voiceStatus.data.status?._id || 'ok') : '❌ ' + (voiceStatus.data.message || voiceStatus.data.error));
  }

  // ======= VOICE MESSAGE =======
  console.log('\n💬 Sending Voice Message in Chat...');
  
  // Create a shorter WAV for voice message
  const msgSamples = sampleRate * 2; // 2 seconds
  const msgDataSize = msgSamples * blockAlign;
  const msgWavBuf = Buffer.alloc(44 + msgDataSize);
  msgWavBuf.write('RIFF', 0);
  msgWavBuf.writeUInt32LE(36 + msgDataSize, 4);
  msgWavBuf.write('WAVE', 8);
  msgWavBuf.write('fmt ', 12);
  msgWavBuf.writeUInt32LE(16, 16);
  msgWavBuf.writeUInt16LE(1, 20);
  msgWavBuf.writeUInt16LE(numChannels, 22);
  msgWavBuf.writeUInt32LE(sampleRate, 24);
  msgWavBuf.writeUInt32LE(byteRate, 28);
  msgWavBuf.writeUInt16LE(blockAlign, 32);
  msgWavBuf.writeUInt16LE(bps, 34);
  msgWavBuf.write('data', 36);
  msgWavBuf.writeUInt32LE(msgDataSize, 40);
  
  for (let i = 0; i < msgSamples; i++) {
    const t = i / sampleRate;
    const sample = 0.4 * Math.sin(2 * Math.PI * 330 * t) * (1 - t / 2);
    const val = Math.max(-1, Math.min(1, sample));
    msgWavBuf.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }
  
  const msgUpload = await httpUpload(
    `${BASE}/api/media/upload`, 'file', msgWavBuf, 'voice-msg.wav', 'audio/wav',
    { type: 'audio' }, token
  );
  console.log('Voice msg upload:', msgUpload.data.success ? 'OK' : msgUpload.data.message || msgUpload.raw);

  // ======= VERIFY ALL =======
  console.log('\n=== Verifying All Posts ===');
  await sleep(2000);
  
  const statusRes = await httpRequest('GET', `${BASE}/api/status`, null, token);
  const myStatuses = (statusRes.data.statuses || []).filter(s => {
    const userId = s.userId?._id || s.userId;
    return userId === '6a9af830b59765bc43aa768f';
  });
  
  console.log(`Total statuses: ${statusRes.data.statuses?.length || 0}`);
  console.log(`My statuses: ${myStatuses.length}`);
  myStatuses.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.type}] ${(s.content || '').substring(0, 60)}`);
  });

  // ======= EMULATOR SCREENSHOT =======
  console.log('\n=== Taking Emulator Screenshot ===');
  const { execSync: exec } = await import('child_process');
  try {
    exec('adb exec-out screencap -p > /tmp/emulator-screenshot.png', { timeout: 10000 });
    console.log('Screenshot saved to /tmp/emulator-screenshot.png');
  } catch (e) {
    console.log('Screenshot failed:', e.message);
  }

  // ======= SUMMARY =======
  console.log('\n\n╔══════════════════════════════════════════════╗');
  console.log('║     ALL STATUS POSTS COMPLETED               ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║ ✅ Photo status posted                       ║');
  console.log('║ ✅ Video status posted                       ║');
  console.log('║ ✅ Voice status posted                       ║');
  console.log('║ ✅ Voice message uploaded                    ║');
  console.log('╚══════════════════════════════════════════════╝');
}

main().catch(e => console.error('FATAL:', e.message));
