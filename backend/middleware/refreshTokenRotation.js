/**
 * Refresh Token Rotation with Redis Blacklist.
 *
 * When a client presents a refresh token to get a new access token, the
 * old refresh token is invalidated (blacklisted) and a fresh pair is
 * issued. This prevents token reuse attacks: if a stolen refresh token
 * is used after a legitimate rotation, the first use succeeds but the
 * second (attacker's) use fails because the token has been blacklisted.
 *
 * Flow:
 *   1. Client sends refresh token → POST /api/auth/refresh
 *   2. Server verifies token, checks blacklist
 *   3. Server generates new access + refresh tokens
 *   4. Server blackslists old refresh token
 *   5. Server updates user.refreshTokenVersion (stale tokens rejected)
 *   6. Returns new token pair to client
 *
 * Env: JWT_REFRESH_SECRET, JWT_SECRET, REDIS_URL
 */
const jwt = require('jsonwebtoken');
const { blacklistToken, isTokenBlacklistable } = require('./tokenBlacklist');
const User = require('../models/User');

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Handle a refresh-token exchange.
 * @param {object} req  - Express request (body.refreshToken required)
 * @param {object} res  - Express response
 */
async function handleRefreshToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  // 1. Check if the token has been blacklisted
  if (await isTokenBlacklisted(refreshToken)) {
    return res.status(403).json({ success: false, message: 'Refresh token has been revoked' });
  }

  // 2. Verify the JWT signature
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  // 3. Fetch the user
  const user = await User.findById(decoded.userId || decoded.id);
  if (!user) {
    return res.status(403).json({ success: false, message: 'User not found' });
  }

  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: 'Account is blocked' });
  }

  // 4. Verify the refresh token version (rotation invalidation)
  if (user.refreshTokenVersion && decoded.version !== undefined && decoded.version !== user.refreshTokenVersion) {
    return res.status(403).json({ success: false, message: 'Token has been rotated — please log in again' });
  }

  // 5. Blacklist the old refresh token
  await blacklistToken(refreshToken, REFRESH_TTL_SECONDS);

  // 6. Generate new token pair with incremented version
  const newVersion = (user.refreshTokenVersion || 0) + 1;

  const newAccessToken = jwt.sign(
    { userId: user._id, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );

  const newRefreshToken = jwt.sign(
    { userId: user._id, version: newVersion },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );

  // 7. Persist the new version
  await User.findByIdAndUpdate(user._id, { refreshTokenVersion: newVersion });

  res.json({
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
}

module.exports = { handleRefreshToken };
