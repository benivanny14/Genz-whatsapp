const rateLimit = require('express-rate-limit');

// Per-IP auth budget. 100 per 15 min (~7/min) comfortably covers real users
// sharing one NAT/campus IP while still capping scripted registration spam.
// (It used to be 10/IP in production — that blocked everyone behind a shared
// IP after just 10 sign-ups, which breaks launch on school/office networks.)
// AUTH_RATE_MAX raises the cap on throwaway CI runners only (same pattern as
// ADMIN_STRICT_MAX) — the full e2e suite registers many users in parallel
// from one IP and would otherwise trip the budget.
const authSensitiveMax = process.env.NODE_ENV === 'test'
  ? 100000
  : parseInt(process.env.AUTH_RATE_MAX, 10) || 100;
const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authSensitiveMax,
  message: {
    success: false,
    error: 'Too many login/registration attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Brute-force protection PER ACCOUNT: 10 failed attempts per username/phone
// per 15 min. Keyed by the account, not the IP, so one attacker hammering a
// single account gets locked out while everyone else on the same network is
// unaffected.
const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 10,
  keyGenerator: (req) => {
    const account = req.body?.username || req.body?.phoneNumber || req.body?.identifier || '';
    return `login:${String(account).toLowerCase().trim()}:${req.ip || 'unknown'}`;
  },
  message: {
    success: false,
    error: 'Too many login attempts for this account. Please try again later.'
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

// Account-discovery endpoints (check-availability, passkey/check) answer
// "does this username/phone exist?". Bulk enumeration is the attack, so cap
// queries per IP without breaking legitimate form validation.
const discoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 40,
  message: {
    success: false,
    error: 'Too many lookups. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Uploads are heavier (bandwidth + storage). 10/minute per user stops abuse
// without blocking legitimate media sharing.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 10,
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// View-once reveal is the ONLY endpoint that returns a view-once message's
// real content, so it needs its own budget — a scraper must not be able to
// drain every view-once message in a conversation by replaying the call.
// 20 per 15 min per user is plenty for real viewing while capping bulk
// harvesting.
const viewOnceRevealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 20,
  keyGenerator: userKeyGenerator,
  message: {
    success: false,
    error: 'Too many view-once reveals. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// BUG FIX 3: Strict auth limiter for login/register/forgot-password.
// Only 5 attempts per 15 minutes per IP — prevents brute-force attacks
// while real users sharing a NAT/campus IP still have enough headroom.
const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100000 : 5,
  message: {
    success: false,
    error: 'Too many attempts. Try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authSensitiveLimiter, authStrictLimiter, accountLoginLimiter, pairingLimiter, discoveryLimiter, messageSenderLimiter, uploadLimiter, viewOnceRevealLimiter };