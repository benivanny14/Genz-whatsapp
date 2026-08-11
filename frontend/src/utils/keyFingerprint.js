/**
 * Key fingerprinting helpers for E2EE messages.
 *
 * A message envelope carries the sender's public key (JWK). We render a
 * short, stable fingerprint of that key next to the decrypted message and
 * compare it against the sender's backend key history (current + rotated
 * public keys) so the user can see whether an old or new key was used.
 */

const encoder = new TextEncoder();

// Sorted-key JSON gives a stable representation regardless of the order in
// which the JWK properties arrived, so the same key always hashes the same.
export function canonicalJwk(jwk) {
  if (jwk == null || typeof jwk !== 'object') return String(jwk ?? '');
  const sorted = {};
  for (const key of Object.keys(jwk).sort()) {
    sorted[key] = jwk[key];
  }
  return JSON.stringify(sorted);
}

// Short 8-hex-char fingerprint (first 4 bytes of SHA-256 of the canonical
// JWK). Purely cosmetic — collisions are fine for a display badge.
export async function computeKeyFingerprint(jwk) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalJwk(jwk)));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Classify a message's sender key against the sender's key history fetched
// from the backend: 'current' (matches the registered key), 'old' (matches
// a previously rotated key) or 'unknown' (matches neither / no data).
export function classifyKeyAgainstHistory(senderPublicKey, history) {
  if (!history) return 'unknown';
  const canonical = canonicalJwk(senderPublicKey);
  if (canonical === canonicalJwk(history.currentPublicKey)) return 'current';
  const old = (history.history || []).some((entry) => canonical === canonicalJwk(entry.publicKey));
  return old ? 'old' : 'unknown';
}
