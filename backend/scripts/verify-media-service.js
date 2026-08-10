/**
 * Quick end-to-end sanity check for mediaProcessingService:
 * generates a noisy image with sharp, serves it over local http, then
 * runs processAndCompressMedia against it and prints the result.
 * Not part of the test suite — a manual/dev verification helper.
 */
process.env.NODE_ENV = 'development';

const http = require('http');
const sharp = require('sharp');
const { processAndCompressMedia } = require('../services/mediaProcessingService');

(async () => {
  // 1. Generate a real image with lots of noise (compressible)
  const width = 2400;
  const height = 1600;
  const buf = Buffer.alloc(width * height * 3);
  for (let i = 0; i < buf.length; i += 3) {
    buf[i] = (i / 3) % 256;
    buf[i + 1] = (i / 7) % 256;
    buf[i + 2] = (i / 11) % 256;
  }
  const raw = await sharp(buf, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': raw.length });
    res.end(raw);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/test.jpg`;

  try {
    const result = await processAndCompressMedia({ fileUrl: url, fileType: 'image', compressionLevel: 'high' });
    console.log('compressedUrl:', result.compressedUrl);
    console.log('originalSize:', result.originalSize);
    console.log('compressedSize:', result.compressedSize);
    console.log('compressionRatio:', result.compressionRatio + '%');
    console.log('format:', result.format);
    console.log('storageProvider:', result.storageProvider);
    if (!result.compressedUrl || result.compressedSize >= result.originalSize) {
      console.error('VERIFY FAILED: compression did not reduce the file');
      process.exit(1);
    }
    console.log('VERIFY OK: real compression pipeline works');
  } finally {
    server.close();
  }
})().catch((err) => {
  console.error('VERIFY FAILED:', err.message);
  process.exit(1);
});
