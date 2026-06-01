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
          : '🔒 Haiwezi kusimbuliwa';

    return { ...message, content: plaintext, _e2eeDecrypted: true };
  } catch {
    return { ...message, content: '🔒 Haiwezi kusimbuliwa', _e2eeDecrypted: false };
  }
}

export async function decryptMessagesList(messages = []) {
  const decrypted = await Promise.all(messages.map((m) => decryptMessageContent(m)));
  return decrypted;
}
