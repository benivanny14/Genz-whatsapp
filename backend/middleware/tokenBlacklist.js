/**
 * Token Blacklist — Redis-backed revoked-token store.
 *
 * When a user logs out, changes password, or their refresh token is rotated,
 * the old JWT is added to this blacklist. Both HTTP middleware and WebSocket
 * auth check against it before trusting the token.
 *
 * Env: REDIS_URL (falls back to in-memory Map for single-instance dev)
 *
 * Usage:
 *   const { blacklistToken, isTokenBlacklisted } = require('./middleware/tokenBlacklist');
 *   await blacklistToken(token, expirySeconds);
 *   const revoked = await isTokenBlacklisted(token);
 */
const PREFIX = 'tokenbl:';
const DEFAULT_TTL = 24 * 60 * 60; // 24 hours (should match JWT expiry)

// In-memory fallback for dev/standalone mode
const memoryBlacklist = new Set();

function getRedis() {
  return (typeof global !== 'undefined' ? global.redisClient : null) || null;
}

/**
 * Blacklist a JWT for its remaining lifetime.
 * @param {string} token  - the JWT string
 * @param {number} [ttl]  - seconds until the blacklist entry expires
 */
async function blacklistToken(token, ttl = DEFAULT_TTL) {
  const rc = getRedis();
  if (rc && rc.isOpen) {
    try {
      await rc.setEx(`${PREFIX}${token}`, ttl, '1');
      return;
    } catch (err) {
      console.error('[TokenBlacklist] Redis SET failed, falling back to memory:', err.message);
    }
  }
  memoryBlacklist.add(token);
  // Auto-expire from memory after ttl (best-effort)
  setTimeout(() => memoryBlacklist.delete(token), ttl * 1000);
}

/**
 * Check if a JWT has been revoked.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function isTokenBlacklisted(token) {
  const rc = getRedis();
  if (rc && rc.isOpen) {
    try {
      return Boolean(await rc.get(`${PREFIX}${token}`));
    } catch (err) {
      console.error('[TokenBlacklist] Redis GET failed:', err.message);
    }
  }
  return memoryBlacklist.has(token);
}

module.exports = { blacklistToken, isTokenBlacklisted };
