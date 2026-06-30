/** Payload produced by frontend/src/services/encryptionService.js */
export const CLIENT_E2EE_ALGORITHM = 'ECDH-P256+AES-256-GCM';

export function getE2EEEnvelope(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t.startsWith('{')) return null;
    try {
      obj = JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const hasCore =
    obj.ciphertext &&
    obj.iv &&
    obj.senderPublicKey &&
    (obj.algorithm === CLIENT_E2EE_ALGORITHM || obj.version === 1);
  return hasCore ? obj : null;
}

export function isClientE2EEMessageContent(content) {
  return Boolean(getE2EEEnvelope(content));
}
