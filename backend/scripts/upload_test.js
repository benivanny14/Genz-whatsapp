const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

async function createSilentWav(filePath, seconds = 1, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Data (silence)
  // already zeroed by Buffer.alloc

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function uploadTest() {
  try {
    const fetch = global.fetch || (await import('node-fetch')).default;
    const FormData = global.FormData || (await import('form-data')).default;

    const tmpDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const wavPath = path.join(tmpDir, `test-${Date.now()}.wav`);

    createSilentWav(wavPath, 1, 16000);
    console.log('Created test wav:', wavPath);

    const form = new FormData();
    form.append('file', fs.createReadStream(wavPath));

    const API = process.env.API_URL || 'http://localhost:5000';
    console.log('Uploading to:', `${API}/api/media/upload`);

    const headers = form.getHeaders ? form.getHeaders() : {};
    // include device header to trigger device fallback auth
    headers['X-Device-ID'] = process.env.DEVICE_ID || 'local-web-device';

    const res = await fetch(`${API}/api/media/upload`, {
      method: 'POST',
      body: form,
      headers
    });

    console.log('Status:', res.status);
    const txt = await res.text();
    console.log('Response body:', txt);
  } catch (e) {
    console.error('Upload test error:', e);
  }
}

uploadTest();
