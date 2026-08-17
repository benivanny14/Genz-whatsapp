const crypto = require('crypto');

// Stateless, signed, expiring share token for a single status. The owner
// mints one when generating a QR/share link; anyone with the link (even
// anonymous visitors) can view that status regardless of its privacy level
// until the token expires. No DB writes — the payload is `statusId:expiresAt`
// HMAC-SHA256 signed with the app secret.
const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

const createShareToken = (statusId, ttlMs = SHARE_TTL_MS) => {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${String(statusId)}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || '')
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
};

// Returns { statusId } when the token is well-formed, unexpired and signed
// with the app secret; otherwise null.
const verifyShareToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;
    const payload = Buffer.from(dataB64, 'base64url').toString('utf8');
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET || '')
      .update(payload)
      .digest('base64url');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const colon = payload.lastIndexOf(':');
    if (colon <= 0) return null;
    const statusId = payload.slice(0, colon);
    const expiresAt = Number(payload.slice(colon + 1));
    if (!statusId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return { statusId };
  } catch {
    return null;
  }
};

module.exports = { createShareToken, verifyShareToken, SHARE_TTL_MS };
