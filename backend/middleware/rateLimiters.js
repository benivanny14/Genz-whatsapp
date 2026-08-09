const rateLimit = require('express-rate-limit');

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : (process.env.NODE_ENV === 'test' ? 100000 : 20),
  message: {
    success: false,
    error: 'Too many login/registration attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Pairing is a public, credential-free endpoint (the pairing token IS the
// auth). Brute-forcing the token could grant full account takeover, so keep
// attempts low and bursty.
const pairingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : (process.env.NODE_ENV === 'test' ? 100000 : 50),
  message: {
    success: false,
    error: 'Too many pairing attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user key generator: rate limits are tied to the authenticated account
// (req.user._id) rather than the shared IP, so one user behind a NAT or VPN
// cannot burn the budget for everyone else.
const userKeyGenerator = (req) => `user:${req.user?._id || req.ip || 'unknown'}`;

// Sending messages is cheap for a human but expensive for a bot. 120/minute
// comfortably covers a real user while capping scripted spam.
const messageSenderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 120,
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many messages sent. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Uploads are heavier (bandwidth + storage). 30/minute per user stops abuse
// without blocking legitimate media sharing.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 30,
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authSensitiveLimiter, pairingLimiter, messageSenderLimiter, uploadLimiter };