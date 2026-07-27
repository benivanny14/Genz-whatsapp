const {
  signMediaPath,
  verifyMediaSignature,
  buildSignedUploadPath,
  normalizeRelativePath
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
});
