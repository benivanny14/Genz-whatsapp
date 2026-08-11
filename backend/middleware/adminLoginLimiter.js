const rateLimit = require('express-rate-limit');

// Deliberately much stricter than the normal authLimiter — this endpoint
// protects the single most powerful account in the whole system.
//
// The limit is env-overridable (ADMIN_LOGIN_MAX) so CI can raise it ONLY for
// the parallel admin-spec stress run (throwaway secrets, ephemeral runner);
// production keeps the strict default of 10 per 15 minutes.
const configuredMax = parseInt(process.env.ADMIN_LOGIN_MAX, 10);
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 10,
  message: { success: false, error: 'Too many admin login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { adminLoginLimiter };
