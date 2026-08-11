const {
  computePublicKeyFingerprint,
  classifyPublicKeyAgainstHistory
} = require('./keyFingerprint');

/**
 * E2EE message stamping — shared by the socket send handler, the REST
 * sendMessage controller and the backfill script, so every path stamps
 * messages identically.
 */

// Recognizes a client-side E2EE envelope (the payload produced by
// frontend/src/services/encryptionService.js).
function isE2EEContent(content) {
  return typeof content === 'string' &&
    content.trim().startsWith('{') &&
    content.includes('ciphertext') &&
    content.includes('senderPublicKey');
}

function parseEnvelope(content) {
  if (!isE2EEContent(content)) return null;
  try {
    const obj = JSON.parse(content);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

/**
 * Computes the stamp for an E2EE message: fingerprint of the envelope's
 * senderPublicKey plus whether that key is the sender's registered
 * ('current') or a previously rotated ('old') key.
 *
 * @param {string} content - raw message content (E2EE envelope JSON)
 * @param {object|null} senderUser - sender's user document with
 *   encryptionKeys + encryptionKeyHistory (may be null to skip classification)
 * @returns {{ e2eeKeyFingerprint: string, e2eeKeyStatus: string }|null}
 */
function stampE2EEMessage(content, senderUser) {
  const envelope = parseEnvelope(content);
  if (!envelope || !envelope.senderPublicKey) return null;
  return {
    e2eeKeyFingerprint: computePublicKeyFingerprint(envelope.senderPublicKey),
    e2eeKeyStatus: senderUser
      ? classifyPublicKeyAgainstHistory(
          envelope.senderPublicKey,
          senderUser.encryptionKeys?.publicKey,
          senderUser.encryptionKeyHistory || []
        )
      : 'unknown'
  };
}

module.exports = {
  isE2EEContent,
  parseEnvelope,
  stampE2EEMessage
};
