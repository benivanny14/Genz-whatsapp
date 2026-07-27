/**
 * E2E: media upload (voice) + view-once text message via HTTP API.
 * Usage:
 *   TEST_EMAIL=... TEST_PASSWORD=... node backend/scripts/test-voice-viewonce-e2e.js
 */
const fs = require('fs');
const path = require('path');

const API = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_BASE = `${API}/api`;

function createSilentWav(filePath, seconds = 1, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filePath, buffer);
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

async function login() {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('Set TEST_EMAIL and TEST_PASSWORD env vars');
  }
  const { ok, status, body } = await jsonFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!ok || !body.token) {
    throw new Error(`Login failed (${status}): ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function getConversations(token) {
  const { ok, status, body } = await jsonFetch(`${API_BASE}/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!ok) throw new Error(`Conversations failed (${status}): ${JSON.stringify(body)}`);
  return body.conversations || body.data || [];
}

async function main() {
  const fetchFn = global.fetch || (await import('node-fetch')).default;
  global.fetch = fetchFn;

  console.log('API:', API_BASE);
  const token = await login();
  console.log('✓ Login OK');

  const conversations = await getConversations(token);
  const conv = conversations.find((c) => !c.isGroup) || conversations[0];
  if (!conv?._id) {
    throw new Error('No conversation available for test');
  }
  console.log('✓ Using conversation', conv._id);

  const viewOnceText = `view-once-test-${Date.now()}`;
  const sendViewOnce = await jsonFetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId: conv._id,
      content: viewOnceText,
      messageType: 'text',
      isViewOnce: true
    })
  });
  if (!sendViewOnce.ok || !sendViewOnce.body?.message?.isViewOnce) {
    throw new Error(`View-once send failed: ${JSON.stringify(sendViewOnce.body)}`);
  }
  console.log('✓ View-once text sent', sendViewOnce.body.message._id);

  const tmpDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const wavPath = path.join(tmpDir, `voice-e2e-${Date.now()}.wav`);
  createSilentWav(wavPath, 1);

  const FormData = global.FormData || (await import('form-data')).default;
  const form = new FormData();
  form.append('file', fs.createReadStream(wavPath));
  form.append('duration', '1');

  const uploadHeaders = form.getHeaders ? form.getHeaders() : {};
  uploadHeaders.Authorization = `Bearer ${token}`;

  const uploadRes = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    headers: uploadHeaders,
    body: form
  });
  const uploadBody = await uploadRes.json();
  if (!uploadRes.ok || !uploadBody.fileUrl) {
    throw new Error(`Voice upload failed: ${JSON.stringify(uploadBody)}`);
  }
  console.log('✓ Voice file uploaded', uploadBody.fileUrl);

  const sendVoice = await jsonFetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId: conv._id,
      content: uploadBody.fileUrl,
      messageType: 'audio',
      mediaUrl: uploadBody.fileUrl,
      duration: 1,
      isViewOnce: false
    })
  });
  if (!sendVoice.ok || !sendVoice.body?.message?.mediaUrl) {
    throw new Error(`Voice message failed: ${JSON.stringify(sendVoice.body)}`);
  }
  console.log('✓ Voice message sent', sendVoice.body.message._id);

  console.log('\nAll messaging E2E checks passed.');
}

main().catch((err) => {
  console.error('\nE2E FAILED:', err.message);
  process.exit(1);
});
