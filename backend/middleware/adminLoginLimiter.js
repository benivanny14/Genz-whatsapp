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

// ── Per-IP brute-force tracking ──────────────────────────────────────────
// Tracks repeated lockout-triggering IPs. If the same IP triggers lockout
// multiple times, we escalate the lockout window for that IP. This catches
// distributed brute-force attacks that rotate through usernames/passwords
// but originate from the same IP/infra.
const LOCKOUT_IP_STORE = new Map(); // ip → { count, lockUntil }
const IP_LOCKOUT_BASE_MS = 15 * 60 * 1000; // 15 min base
const IP_LOCKOUT_MAX_MS = 24 * 60 * 60 * 1000; // 24h cap
const IP_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly cleanup

let lastCleanup = Date.now();
function cleanupIpStore() {
  const now = Date.now();
  if (now - lastCleanup < IP_CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, entry] of LOCKOUT_IP_STORE) {
    if (entry.lockUntil && entry.lockUntil < now) LOCKOUT_IP_STORE.delete(ip);
  }
}

/**
 * Express middleware: blocks admin login from IPs that have triggered
 * account lockout too many times. Escalating lockout:
 *   1st lockout → 15 min IP block
 *   2nd lockout → 30 min
 *   3rd+ lockout → up to 24h
 */
function perIpBruteForceBlock(req, res, next) {
  cleanupIpStore();
  const ip = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.connection?.remoteAddress;
  const entry = LOCKOUT_IP_STORE.get(ip);
  if (entry && entry.lockUntil && entry.lockUntil > Date.now()) {
    const remaining = Math.ceil((entry.lockUntil - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      error: `Too many failed admin attempts from this IP. Try again in ${remaining} min.`
    });
  }
  next();
}

/**
 * Called after a lockout event (failedLoginAttempts >= 5 or >= 10).
 * Escalates the per-IP block duration for repeat offenders.
 */
function recordIpLockout(req) {
  const ip = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.connection?.remoteAddress;
  const now = Date.now();
  const prev = LOCKOUT_IP_STORE.get(ip);
  const count = (prev?.count || 0) + 1;
  // Exponential: 15min × 2^(count-1), capped at 24h
  const lockMs = Math.min(IP_LOCKOUT_BASE_MS * Math.pow(2, count - 1), IP_LOCKOUT_MAX_MS);
  LOCKOUT_IP_STORE.set(ip, { count, lockUntil: now + lockMs });
}

module.exports = { adminLoginLimiter, perIpBruteForceBlock, recordIpLockout };
