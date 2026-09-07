const {
  signMediaPath,
  verifyMediaSignature,
  buildSignedUploadPath,
  normalizeRelativePath,
  signLocalUrlIfNeeded
} = require('../utils/mediaAccess');

describe('mediaAccess', () => {
  const originalSecret = process.env.MEDIA_ACCESS_SECRET;

  beforeAll(() => {
    process.env.MEDIA_ACCESS_SECRET = 'test-media-secret-with-enough-length';
  });

  afterAll(() => {
    process.env.MEDIA_ACCESS_SECRET = originalSecret;
  });

  it('normalizes upload paths', () => {
    expect(normalizeRelativePath('/uploads/foo/bar.jpg')).toBe('foo/bar.jpg');
    expect(normalizeRelativePath('uploads/baz.png')).toBe('baz.png');
  });

  it('signs and verifies media paths', () => {
    const { normalized, expires, sig } = signMediaPath('sample.jpg', 3600);
    expect(normalized).toBe('sample.jpg');
    expect(verifyMediaSignature('sample.jpg', expires, sig)).toBe(true);
    expect(verifyMediaSignature('sample.jpg', expires - 1, sig)).toBe(false);
  });

  it('builds signed upload URLs with query params', () => {
    const signed = buildSignedUploadPath('file.png');
    expect(signed).toMatch(/^\/uploads\/file\.png\?expires=\d+&sig=[a-f0-9]+$/);
  });

  it('normalizes status media paths across both mounts', () => {
    expect(normalizeRelativePath('/uploads/status/abc.mp4')).toBe('status/abc.mp4');
    expect(normalizeRelativePath('/api/uploads/status/abc.mp4')).toBe('status/abc.mp4');
    expect(normalizeRelativePath('uploads/status/abc.mp4')).toBe('status/abc.mp4');
  });

  it('signs status media to the /api/uploads/status mount with a matching signature', () => {
    const signed = signLocalUrlIfNeeded('/api/uploads/status/abc.mp4', 'http://api');
    expect(signed).toMatch(/^http:\/\/api\/api\/uploads\/status\/abc\.mp4\?expires=\d+&sig=[a-f0-9]+$/);
    const [, query] = signed.split('?');
    const params = new URLSearchParams(query);
    // Middleware on /api/uploads/status verifies from req.originalUrl:
    expect(verifyMediaSignature('/api/uploads/status/abc.mp4', params.get('expires'), params.get('sig'))).toBe(true);
    // Same signature also works through the legacy /uploads mount:
    expect(verifyMediaSignature('/uploads/status/abc.mp4', params.get('expires'), params.get('sig'))).toBe(true);
    // And for the path the /uploads mount sees after stripping its prefix:
    expect(verifyMediaSignature('/status/abc.mp4', params.get('expires'), params.get('sig'))).toBe(true);
    // Signature must NOT validate for a different file:
    expect(verifyMediaSignature('/status/other.mp4', params.get('expires'), params.get('sig'))).toBe(false);
  });

  it('keeps non-status uploads on the /uploads mount', () => {
    const signed = signLocalUrlIfNeeded('/uploads/chat/abc.png', 'http://api');
    expect(signed).toMatch(/^http:\/\/api\/uploads\/chat\/abc\.png\?expires=\d+&sig=[a-f0-9]+$/);
    const [, query] = signed.split('?');
    const params = new URLSearchParams(query);
    expect(verifyMediaSignature('/chat/abc.png', params.get('expires'), params.get('sig'))).toBe(true);
  });
});
