import CryptoJS from 'crypto-js';

export const formatConversationTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatMessageTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Decrypt function for encrypted messages using AES-256-CBC (matching backend)
export const decryptMessage = (encryptedData) => {
  if (!encryptedData) return "";
  if (typeof encryptedData === 'string') return encryptedData;
  
  // If it's an encrypted object with iv and content
  if (encryptedData && encryptedData.iv && encryptedData.content) {
    try {
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
      const encrypted = CryptoJS.enc.Hex.parse(encryptedData.content);
      const configuredSecret = import.meta.env.VITE_MESSAGE_ENCRYPTION_SECRET;
      const configuredIterations = Number(import.meta.env.VITE_MESSAGE_ENCRYPTION_ITERATIONS || 100000);
      const candidates = configuredSecret
        ? [{ secret: configuredSecret, iterations: configuredIterations }]
        : [];

      // Legacy fallback keeps old locally-encrypted messages readable while the
      // app migrates to the per-device E2EE pipeline.
      candidates.push({ secret: "GENZ_WHATSAPP_SECRET_KEY", iterations: 1 });

      for (const candidate of candidates) {
        try {
          const key = CryptoJS.PBKDF2(candidate.secret, "salt", {
            keySize: 256 / 32,
            iterations: candidate.iterations
          }).toString();

          const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encrypted },
            CryptoJS.enc.Hex.parse(key),
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
          );

          const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
          if (decryptedString) return decryptedString;
        } catch {
          // Try the next compatible legacy key.
        }
      }

      return encryptedData.content || "";
    } catch (error) {
      console.error('Decryption error:', error);
      // Fallback to raw content, ensure it's a string
      const fallback = encryptedData.content;
      return typeof fallback === 'string' ? fallback : JSON.stringify(fallback) || "";
    }
  }
  
  // If it's just content without iv (already decrypted or different format)
  if (encryptedData && encryptedData.content) {
    const content = encryptedData.content;
    return typeof content === 'string' ? content : JSON.stringify(content) || "";
  }
  
  // Fallback for any other case - always return string
  const result = JSON.stringify(encryptedData) || "";
  return typeof result === 'string' ? result : String(result);
};
