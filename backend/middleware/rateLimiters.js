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

module.exports = { authSensitiveLimiter };