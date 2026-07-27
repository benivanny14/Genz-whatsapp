const encoder = new TextEncoder();
const decoder = new TextDecoder();

const API_ORIGIN = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_BASE_URL = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const ensureCrypto = () => {
  if (!window.crypto?.subtle) {
    throw new Error('WebCrypto is not available in this browser');
  }
  return window.crypto.subtle;
};

const importPublicKey = async (key) => {
  if (typeof CryptoKey !== 'undefined' && key instanceof CryptoKey) return key;
  let jwk = key;
  if (typeof key === 'string') {
    const t = key.trim();
    if (!t.startsWith('{')) throw new Error('Invalid public key format');
    try {
      jwk = JSON.parse(t);
    } catch {
      throw new Error('Invalid public key JSON');
    }
  }
  return ensureCrypto().importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
};

class EncryptionService {
  constructor() {
    this.keyPair = null;
    this.isInitialized = false;
    this.backendKeys = null;
    this._boundStorageKey = null;
  }

  getStorageKey() {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?._id) return `genz_e2ee_keypair_v1_${u._id}`;
    } catch (_) {
      /* ignore */
    }
    return 'genz_e2ee_keypair_v1_anon';
  }

  async initialize() {
    const storageKey = this.getStorageKey();
    if (this.isInitialized) {
      if (this._boundStorageKey === storageKey) return true;
      this.cleanup();
    }
    this._boundStorageKey = storageKey;

    try {
      // Try to sync with backend first
      await this.syncWithBackend();

      // Fall back to local storage if backend sync fails
      if (!this.keyPair) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          await this.importKeys(JSON.parse(stored));
        } else {
          await this.generateKeyPair();
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('Encryption initialization skipped (WebCrypto may be unavailable):', error.message || error);
      return false;
    }
  }

  async syncWithBackend() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/encryption/keys/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.hasKeys) {
        // Get public keys from backend
        const keysResponse = await fetch(`${API_BASE_URL}/encryption/keys/public`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const keysData = await keysResponse.json();
        
        if (keysData.success && keysData.keys) {
          this.backendKeys = keysData.keys;
          console.log('[EncryptionService] Synced keys from backend');
        }
      }
    } catch (error) {
      console.warn('[EncryptionService] Backend sync failed:', error);
    }
  }

  async generateKeyPair() {
    const subtle = ensureCrypto();
    this.keyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );

    const exported = await this.exportKeys({ includePrivate: true });
    localStorage.setItem(this.getStorageKey(), JSON.stringify(exported.data));

    // Upload to backend if authenticated
    await this.uploadKeysToBackend(exported.data);

    return {
      success: true,
      keyPair: {
        publicKey: exported.data.publicKey
      }
    };
  }

  async uploadKeysToBackend(keyData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // Production-critical E2EE rule: only public keys are registered with
      // the backend. Private keys stay in browser storage and are never sent.
      const response = await fetch(`${API_BASE_URL}/encryption/keys/public`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey: keyData.publicKey
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to register public encryption key');
      }

      this.backendKeys = data.keys;
      return true;
    } catch (error) {
      console.error('[EncryptionService] Failed to upload keys:', error);
      return false;
    }
  }

  async exportKeys(options = {}) {
    if (!this.keyPair) {
      throw new Error('Encryption service not initialized');
    }

    const subtle = ensureCrypto();
    const publicKey = await subtle.exportKey('jwk', this.keyPair.publicKey);
    const data = { publicKey };

    if (options.includePrivate) {
      data.privateKey = await subtle.exportKey('jwk', this.keyPair.privateKey);
    }

    return {
      success: true,
      data
    };
  }

  async importKeys(keyData) {
    if (!keyData?.publicKey || !keyData?.privateKey) {
      throw new Error('Public and private keys are required');
    }

    const subtle = ensureCrypto();
    const [publicKey, privateKey] = await Promise.all([
      subtle.importKey('jwk', keyData.publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
      subtle.importKey('jwk', keyData.privateKey, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
    ]);

    this.keyPair = { publicKey, privateKey };
    this.isInitialized = true;

    return {
      success: true,
      data: { publicKey: keyData.publicKey }
    };
  }

  async verifyKeys(keyData) {
    try {
      if (keyData?.publicKey) {
        await importPublicKey(keyData.publicKey);
      }
      if (keyData?.privateKey) {
        await ensureCrypto().importKey(
          'jwk',
          keyData.privateKey,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          ['deriveKey']
        );
      }

      return {
        success: true,
        isValid: true
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        isValid: false
      };
    }
  }

  async deriveMessageKey(peerPublicKey) {
    if (!this.keyPair?.privateKey) {
      throw new Error('Encryption service not initialized');
    }

    return ensureCrypto().deriveKey(
      {
        name: 'ECDH',
        public: await importPublicKey(peerPublicKey)
      },
      this.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptMessage(message, recipientKey) {
    if (!this.keyPair) {
      throw new Error('Encryption service not initialized');
    }
    if (!recipientKey) {
      throw new Error('Recipient public key is required');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveMessageKey(recipientKey);
    const ciphertext = await ensureCrypto().encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(String(message))
    );
    const publicKey = await ensureCrypto().exportKey('jwk', this.keyPair.publicKey);

    return {
      success: true,
      encryptedData: {
        version: 1,
        algorithm: 'ECDH-P256+AES-256-GCM',
        iv: toBase64(iv),
        ciphertext: toBase64(ciphertext),
        senderPublicKey: publicKey,
        createdAt: new Date().toISOString()
      }
    };
  }

  async decryptMessage(encryptedData) {
    if (!this.keyPair) {
      throw new Error('Encryption service not initialized');
    }
    if (!encryptedData?.ciphertext || !encryptedData?.iv || !encryptedData?.senderPublicKey) {
      throw new Error('Invalid encrypted message payload');
    }

    const key = await this.deriveMessageKey(encryptedData.senderPublicKey);
    const plaintext = await ensureCrypto().decrypt(
      { name: 'AES-GCM', iv: fromBase64(encryptedData.iv) },
      key,
      fromBase64(encryptedData.ciphertext)
    );

    return {
      success: true,
      decryptedData: decoder.decode(plaintext)
    };
  }

  async getUserPublicKeys(userId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/encryption/keys/public/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        return data.keys;
      }

      throw new Error(data.message || 'Failed to get user keys');
    } catch (error) {
      console.error('[EncryptionService] Failed to get user keys:', error);
      throw error;
    }
  }

  async batchGetPublicKeys(userIds) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/encryption/keys/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.keys;
      }

      throw new Error(data.message || 'Failed to batch get keys');
    } catch (error) {
      console.error('[EncryptionService] Failed to batch get keys:', error);
      throw error;
    }
  }

  isAvailable() {
    return this.isInitialized && Boolean(window.crypto?.subtle);
  }

  cleanup() {
    this.keyPair = null;
    this.isInitialized = false;
    this.backendKeys = null;
    this._boundStorageKey = null;
  }
}

const encryptionService = new EncryptionService();

export default encryptionService;
export { EncryptionService };
