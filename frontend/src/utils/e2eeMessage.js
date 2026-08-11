import encryptionService from '../services/encryptionService';
import { getE2EEEnvelope } from './e2eeContent';

export async function decryptMessageContent(message) {
  if (!message) return message;

  const envelope = getE2EEEnvelope(message.content);
  if (!envelope) return message;

  try {
    const ok = await encryptionService.initialize();
    if (!ok) return { ...message, content: '🔒 Encrypted message' };

    const result = await encryptionService.decryptMessage(envelope);
    const plaintext =
      typeof result?.decryptedData === 'string'
        ? result.decryptedData
        : result?.decryptedData != null
          ? JSON.stringify(result.decryptedData)
          : '🔒 Encrypted message';

    // Whether this message came from a contact the user marked verified AND
    // was encrypted with that contact's current key — drives the "✓ verified"
    // state of the key badge below the message.
    const senderId = message.sender?._id || message.sender;
    let verified = false;
    if (senderId) {
      verified = await encryptionService
        .isMessageFromVerifiedContact(senderId, envelope.senderPublicKey)
        .catch(() => false);
    }

    return { ...message, content: plaintext, _e2eeDecrypted: true, _e2eeVerified: verified };
  } catch {
    return { ...message, content: '🔒 Encrypted message', _e2eeDecrypted: false, _e2eeVerified: false };
  }
}

export async function decryptMessagesList(messages = []) {
  const decrypted = await Promise.all(messages.map((m) => decryptMessageContent(m)));
  return decrypted;
}
