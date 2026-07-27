const rateLimit = require('express-rate-limit');

// Deliberately much stricter than the normal authLimiter — this endpoint
// protects the single most powerful account in the whole system.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many admin login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { adminLoginLimiter };
