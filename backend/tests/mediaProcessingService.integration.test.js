/**
 * Integration test for mediaProcessingService — exercises the REAL pipeline:
 * serves a generated JPEG over local http, then runs compression and edits
 * through sharp and the upload path (local fallback, since Cloudinary is
 * unconfigured in tests).
 */
const http = require('http');
const sharp = require('sharp');
const { processAndCompressMedia, applyMediaEdits } = require('../services/mediaProcessingService');

describe('mediaProcessingService (integration)', () => {
  let server;
  let imageUrl;

  beforeAll(async () => {
    // A noisy 1600x1200 JPEG — very compressible.
    const width = 1600;
    const height = 1200;
    const buf = Buffer.alloc(width * height * 3);
    for (let i = 0; i < buf.length; i += 3) {
      buf[i] = (i / 3) % 256;
      buf[i + 1] = (i / 7) % 256;
      buf[i + 2] = (i / 11) % 256;
    }
    const raw = await sharp(buf, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer();

    server = http.createServer((req, res) => {
      if (req.url.includes('missing')) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': raw.length });
      res.end(raw);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    imageUrl = `http://127.0.0.1:${server.address().port}/test.jpg`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it('downloads and compresses an image with real sizes (happy path)', async () => {
    const result = await processAndCompressMedia({ fileUrl: imageUrl, fileType: 'image', compressionLevel: 'high' });
    expect(result.compressedUrl).toBeTruthy();
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.compressedSize).toBeLessThan(result.originalSize);
    expect(result.compressionRatio).toBeGreaterThan(0);
    expect(result.format).toBeTruthy();
  });

  it('applies image edits and re-uploads (happy path)', async () => {
    const result = await applyMediaEdits({
      fileUrl: imageUrl,
      type: 'image',
      edits: { rotate: 90, brightness: 1.2, saturation: 1.1 }
    });
    expect(result.editedUrl).toBeTruthy();
    expect(result.format).toBeTruthy();
  });

  it('rejects downloads that return a non-200 status', async () => {
    await expect(
      processAndCompressMedia({ fileUrl: `http://127.0.0.1:${server.address().port}/missing.jpg`, fileType: 'image' })
    ).rejects.toThrow(/HTTP 404/);
  });
});
