/**
 * otpStore.js — lightweight in-memory OTP store for the WhatsApp OTP flow.
 *
 * Design notes:
 *  - TTL is configurable via WHATSAPP_OTP_TTL_MINUTES (default: 5 minutes).
 *  - Each key can hold a limited number of failed verify attempts before the
 *    OTP is invalidated (anti-brute-force).
 *  - In-memory Map is perfect for a single-instance deployment. If you scale
 *    to multiple backend instances, swap the Map for Redis/MongoDB using the
 *    same interface (generate, store, verify, clear).
 */
const crypto = require('crypto');

const TTL_MINUTES = Math.max(1, parseInt(process.env.WHATSAPP_OTP_TTL_MINUTES || '5', 10));
const MAX_ATTEMPTS = 5;

const store = new Map();

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store an OTP for `key` (use the normalized phone number as key).
 * Overwrites any previous OTP for the same key.
 */
function storeOtp(key, otp, ttlMinutes = TTL_MINUTES) {
  const entry = {
    otp: String(otp),
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    attempts: 0,
  };
  store.set(key, entry);
  // Cleanup timer so memory never grows unbounded for abandoned numbers.
  setTimeout(() => {
    const current = store.get(key);
    if (current === entry) store.delete(key);
  }, ttlMinutes * 60 * 1000 + 1000);
  return entry;
}

function getStoredOtp(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry;
}

/**
 * Verify a submitted OTP against the stored one.
 * Returns { success: true } or { success: false, reason: 'invalid'|'expired'|'max_attempts' }.
 * Successful verification removes the OTP (one-time use).
 */
function verifyOtp(key, submittedOtp) {
  const entry = getStoredOtp(key);
  if (!entry) return { success: false, reason: 'expired' };

  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { success: false, reason: 'max_attempts' };
  }

  const submitted = String(submittedOtp || '');
  if (!/^\d{6}$/.test(submitted)) {
    entry.attempts += 1;
    return { success: false, reason: 'invalid' };
  }

  const a = Buffer.from(String(entry.otp));
  const b = Buffer.from(submitted);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    store.delete(key);
    return { success: true };
  }

  entry.attempts += 1;
  return { success: false, reason: 'invalid' };
}

function clearOtp(key) {
  store.delete(key);
}

function hasOtp(key) {
  return Boolean(getStoredOtp(key));
}

module.exports = { generateOtp, storeOtp, verifyOtp, clearOtp, hasOtp, TTL_MINUTES };
