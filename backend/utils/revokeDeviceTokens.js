/**
 * Revoke all tokens for a specific device.
 *
 * When a user unlinks a device, every access + refresh token that device
 * holds must be invalidated. This utility blacklists them in Redis (or
 * the in-memory fallback) so both HTTP middleware and socket auth reject
 * them on next use.
 *
 * Usage:
 *   const { revokeDeviceTokens } = require('../utils/revokeDeviceTokens');
 *   await revokeDeviceTokens(userId, deviceId);
 */
const { blacklistToken } = require('../middleware/tokenBlacklist');

const ACCESS_TTL = 15 * 60;       // 15 minutes (matches JWT expiry)
const REFRESH_TTL = 7 * 86400;    // 7 days

/**
 * Revoke all tokens for a device.
 * @param {string} userId
 * @param {string} deviceId
 */
async function revokeDeviceTokens(userId, deviceId) {
  // We can't enumerate all JWTs for a device, but we can revoke the
  // user's refresh token version (which invalidates all refresh tokens)
  // and blacklist any known active session tokens.

  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('refreshTokenVersion activeSessions');

    if (user) {
      // Bump the refresh token version — all existing refresh tokens become stale
      const newVersion = (user.refreshTokenVersion || 0) + 1;
      await User.findByIdAndUpdate(userId, { refreshTokenVersion: newVersion });

      // Blacklist any session tokens stored for this device
      if (user.activeSessions && Array.isArray(user.activeSessions)) {
        const deviceSessions = user.activeSessions.filter(
          (s) => String(s.device) === String(deviceId)
        );

        for (const session of deviceSessions) {
          if (session.token) {
            await blacklistToken(session.token, ACCESS_TTL);
          }
        }
      }

      console.log(`[RevokeDevice] Revoked tokens for user ${userId}, device ${deviceId} (version → ${newVersion})`);
    }
  } catch (err) {
    console.error('[RevokeDevice] Error revoking tokens:', err.message);
    // Don't throw — token revocation is best-effort
  }
}

module.exports = { revokeDeviceTokens };
