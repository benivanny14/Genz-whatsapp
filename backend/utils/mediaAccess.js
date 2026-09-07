const crypto = require('crypto');
const { JWT_SECRET } = require('../config/secrets');

const DEFAULT_TTL_SECONDS = Number(process.env.MEDIA_URL_TTL_SECONDS || 7 * 24 * 60 * 60);

const getMediaSecret = () =>
  process.env.MEDIA_ACCESS_SECRET ||
  JWT_SECRET;

const normalizeRelativePath = (input = '') => {
  const decoded = decodeURIComponent(String(input).trim());
  const withoutQuery = decoded.split('?')[0];
  const match = withoutQuery.match(/\/uploads\/(.+)$/i) || withoutQuery.match(/^uploads\/(.+)$/i);
  if (match?.[1]) {
    return match[1].replace(/\\/g, '/').replace(/^\/+/, '');
  }
  return withoutQuery.replace(/^\/+/, '');
};

const signMediaPath = (relativePath, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const normalized = normalizeRelativePath(relativePath);
  const expires = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);
  const payload = `${normalized}:${expires}`;
  const sig = crypto.createHmac('sha256', getMediaSecret()).update(payload).digest('hex');
  return { normalized, expires, sig };
};

const buildSignedUploadPath = (relativePath, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const { normalized, expires, sig } = signMediaPath(relativePath, ttlSeconds);
  return `/uploads/${normalized}?expires=${expires}&sig=${sig}`;
};

const buildSignedUploadUrl = (baseUrl, relativePath, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const signedPath = buildSignedUploadPath(relativePath, ttlSeconds);
  return base ? `${base}${signedPath}` : signedPath;
};

const verifyMediaSignature = (relativePath, expires, sig) => {
  if (!relativePath || !expires || !sig) return false;

  const expiresNum = Number(expires);
  if (!Number.isFinite(expiresNum) || expiresNum < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const normalized = normalizeRelativePath(relativePath);
  const payload = `${normalized}:${expiresNum}`;
  const expected = crypto.createHmac('sha256', getMediaSecret()).update(payload).digest('hex');

  try {
    const a = Buffer.from(String(sig), 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

const isMediaSignatureRequired = () => {
  if (process.env.REQUIRE_MEDIA_SIGNATURE === 'false') return false;
  if (process.env.REQUIRE_MEDIA_SIGNATURE === 'true') return true;
  return process.env.NODE_ENV === 'production';
};

const signLocalUrlIfNeeded = (url, baseUrl = '') => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('/uploads/')) return url;
  if (url.includes('sig=') && url.includes('expires=')) return url;

  const relative = normalizeRelativePath(url);
  if (!relative) return url;

  const { expires, sig } = signMediaPath(relative);
  // Status media is also served under /api/uploads/status — Capacitor/emulator
  // builds serve the page from https://localhost while only /api/* requests are
  // proxied to the backend, so plain /uploads/status URLs are unreachable
  // there. Signed status URLs must use that mount (signature payload stays
  // relative to /uploads, which the /api/uploads/status middleware verifies
  // from req.originalUrl). Everything else keeps the /uploads mount.
  const signedPath = relative.startsWith('status/')
    ? `/api/uploads/status/${relative.slice('status/'.length)}?expires=${expires}&sig=${sig}`
    : `/uploads/${relative}?expires=${expires}&sig=${sig}`;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const origin = url.match(/^https?:\/\/[^/]+/i)?.[0] || baseUrl.replace(/\/$/, '');
    return `${origin}${signedPath}`;
  }
  return baseUrl ? `${String(baseUrl).replace(/\/$/, '')}${signedPath}` : signedPath;
};

module.exports = {
  DEFAULT_TTL_SECONDS,
  normalizeRelativePath,
  signMediaPath,
  buildSignedUploadPath,
  buildSignedUploadUrl,
  verifyMediaSignature,
  isMediaSignatureRequired,
  signLocalUrlIfNeeded
};
