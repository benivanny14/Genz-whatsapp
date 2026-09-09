const rateLimit = require('express-rate-limit');
const { getRedisStore } = require('../utils/rateLimitStore');

// Per-user key generator: rate limits are tied to the authenticated account
// (req.user._id) rather than the shared IP, so one user behind a NAT or VPN
// cannot burn the budget for everyone else.
const userKeyGenerator = (req) => `user:${req.user?._id || req.ip || 'unknown'}`;

// Shared defaults applied to every limiter in this file.
const sharedDefaults = {
  standardHeaders: true,
  legacyHeaders: false,
};

// Lazily resolved Redis store — created on first use so Redis has time to
// connect. Returns undefined (→ express-rate-limit default MemoryStore) when
// Redis is unavailable. The global.redisClient is set by server.js after the
// Redis connection succeeds.
let _redisStore = null;
const getStore = () => {
  if (_redisStore) return _redisStore;
  const rc = typeof global !== 'undefined' ? global.redisClient : null;
  if (rc && rc.isOpen) {
    _redisStore = getRedisStore(rc);
  }
  return _redisStore || undefined;
};

// Per-IP auth budget. 100 per 15 min (~7/min) comfortably covers real users
// sharing one NAT/campus IP while still capping scripted registration spam.
const authSensitiveMax = process.env.NODE_ENV === 'test'
  ? 100000
  : parseInt(process.env.AUTH_RATE_MAX, 10) || 100;
const authSensitiveLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 15 * 60 * 1000,
  max: authSensitiveMax,
  store: getStore(),
  message: {
    success: false,
    error: 'Too many login/registration attempts, please try again later.'
  },
});

// Brute-force protection PER ACCOUNT: 10 failed attempts per username/phone
// per 15 min. Keyed by the account, not the IP.
const accountLoginLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 10,
  store: getStore(),
  keyGenerator: (req) => {
    const account = req.body?.username || req.body?.phoneNumber || req.body?.identifier || '';
    return `login:${String(account).toLowerCase().trim()}:${req.ip || 'unknown'}`;
  },
  message: {
    success: false,
    error: 'Too many login attempts for this account. Please try again later.'
  },
});

// Pairing is a public, credential-free endpoint (the pairing token IS the
// auth). Brute-forcing the token could grant full account takeover.
const pairingLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : (process.env.NODE_ENV === 'test' ? 100000 : 50),
  store: getStore(),
  message: {
    success: false,
    error: 'Too many pairing attempts, please try again later.'
  },
});

// Account-discovery endpoints (check-availability, passkey/check).
const discoveryLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 40,
  store: getStore(),
  message: {
    success: false,
    error: 'Too many lookups. Please try again later.'
  },
});

// Sending messages is cheap for a human but expensive for a bot.
const messageSenderLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 120,
  store: getStore(),
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many messages sent. Please slow down.'
  },
});

// Uploads are heavier (bandwidth + storage). 10/minute per user.
const uploadLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 10,
  store: getStore(),
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many uploads. Please slow down.'
  },
});

// View-once reveal is the ONLY endpoint that returns a view-once message's
// real content — a scraper must not drain every view-once message.
const viewOnceRevealLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 20,
  store: getStore(),
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many view-once reveals. Please slow down.'
  },
});

// Strict auth limiter for login/register/forgot-password.
// Only 5 attempts per 15 minutes per IP.
const authStrictMax = process.env.NODE_ENV === 'test'
  ? 100000
  : parseInt(process.env.AUTH_RATE_MAX, 10) || 5;
const authStrictLimiter = rateLimit({
  ...sharedDefaults,
  windowMs: 15 * 60 * 1000,
  max: authStrictMax,
  store: getStore(),
  message: {
    success: false,
    error: 'Too many attempts. Try again in 15 minutes.'
  },
});

module.exports = { authSensitiveLimiter, authStrictLimiter, accountLoginLimiter, pairingLimiter, discoveryLimiter, messageSenderLimiter, uploadLimiter, viewOnceRevealLimiter };
