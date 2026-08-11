const crypto = require('crypto');

/**
 * Key fingerprinting helpers (server side).
 *
 * Mirrors frontend/src/utils/keyFingerprint.js so fingerprints computed by
 * the server (stamped onto E2EE messages at send time) match what the
 * client renders. Values may arrive as JWK objects or as the serialized
 * JSON strings stored in the user document — normalize before comparing.
 */

function normalizeJwk(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  const s = String(value).trim();
  if (s.startsWith('{')) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  return null;
}

// Stable representation regardless of JWK property order.
function canonicalizeJwk(jwk) {
  const normalized = normalizeJwk(jwk);
  if (normalized == null) return '';
  const sorted = {};
  for (const key of Object.keys(normalized).sort()) {
    sorted[key] = normalized[key];
  }
  return JSON.stringify(sorted);
}

// Short 8-hex-char fingerprint (first 4 bytes of SHA-256 of the canonical JWK).
function computePublicKeyFingerprint(jwk) {
  const digest = crypto.createHash('sha256').update(canonicalizeJwk(jwk)).digest();
  return Array.from(digest.subarray(0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// 'current' | 'old' | 'unknown' — is this key the user's registered public
// key or one of their previously rotated keys?
function classifyPublicKeyAgainstHistory(jwk, currentPublicKey, history = []) {
  const canonical = canonicalizeJwk(jwk);
  if (!canonical) return 'unknown';
  if (canonical === canonicalizeJwk(currentPublicKey)) return 'current';
  const old = (history || []).some((entry) => canonical === canonicalizeJwk(entry.publicKey));
  return old ? 'old' : 'unknown';
}

module.exports = {
  normalizeJwk,
  canonicalizeJwk,
  computePublicKeyFingerprint,
  classifyPublicKeyAgainstHistory
};
