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

module.exports = { authSensitiveLimiter, pairingLimiter };