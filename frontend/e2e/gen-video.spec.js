// Temporary helper: records a small animated canvas as a WebM file so we can
// test video→sticker conversion without ffmpeg.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--enable-unsafe-swiftshader'
    ]
  }
});

test.skip('generate test video', async ({ page }) => {
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5176');
  const blobInfo = await page.evaluate(async () => {
    // Record the fake camera feed (color bars) as WebM — no ffmpeg needed.
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 500000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res) => { rec.onstop = res; });
    rec.start(100);
    await new Promise((res) => setTimeout(res, 2500));
    rec.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: 'video/webm' });
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return { size: buf.byteLength, mime: blob.type, b64: btoa(bin) };
  });
  expect(blobInfo.size).toBeGreaterThan(1000);
  const out = path.join(__dirname, 'test-video.webm');
  fs.writeFileSync(out, Buffer.from(blobInfo.b64, 'base64'));
  console.log(`WROTE ${out} size=${blobInfo.size} mime=${blobInfo.mime}`);
});
