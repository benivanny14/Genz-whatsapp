/**
 * TOTP (2FA) rate limiter — brute-force protection for verification codes.
 *
 * Uses rate-limiter-flexible (memory-based, no Redis needed for this endpoint).
 * 5 attempts per 60 seconds; blocked for 5 minutes after exceeding.
 *
 * Without this, an attacker could try all 1000 possible 6-digit codes
 * in seconds. With the limiter, they get 5 tries then a 5-minute lockout,
 * making brute-force infeasible.
 *
 * Usage:
 *   const { totpRateLimit } = require('./middleware/totpRateLimiter');
 *   router.post('/verify-2fa', auth, totpRateLimit, verify2FA);
 */
let RateLimiterMemory;
try {
  RateLimiterMemory = require('rate-limiter-flexible').RateLimiterMemory;
} catch {
  // rate-limiter-flexible not installed — use noop fallback
  RateLimiterMemory = null;
}

const totpLimiter = RateLimiterMemory
  ? new RateLimiterMemory({
      points: 5,           // 5 attempts
      duration: 60,        // per 60 seconds
      blockDuration: 300,  // block 5 minutes after exceeding
      keyPrefix: 'totp',
    })
  : null;

/**
 * Express middleware: rate-limit TOTP verification by userId.
 */
const totpRateLimit = async (req, res, next) => {
  const userId = req.user?._id || req.body?.userId || req.ip;

  if (!totpLimiter) {
    return next(); // fallback: no limiter installed
  }

  try {
    await totpLimiter.consume(userId);
    next();
  } catch (rejRes) {
    const seconds = Math.ceil((rejRes.msBeforeNext || 30000) / 1000);
    return res.status(429).json({
      success: false,
      message: `Majaribio mengi sana. Jaribu tena baada ya sekunde ${seconds}.`,
      retryAfter: seconds,
    });
  }
};

module.exports = { totpRateLimit };
