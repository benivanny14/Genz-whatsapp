import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import { computeKeyFingerprint, classifyKeyAgainstHistory } from '../utils/keyFingerprint';
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
    this._keyHistoryCache = new Map();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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

  async rotateKeys() {
    const subtle = ensureCrypto();

    // 1. Generate a brand-new key pair entirely in the browser (WebCrypto).
    const newKeyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );

    const publicKey = await subtle.exportKey('jwk', newKeyPair.publicKey);
    const privateKey = await subtle.exportKey('jwk', newKeyPair.privateKey);

    // 2. Register the new PUBLIC key with the backend first. The private key
    //    never leaves the browser — and if the backend rejects the rotation,
    //    the old key pair stays active locally so nothing desyncs.
    await this.uploadRotatedPublicKey({ publicKey });

    // 3. Archive the previous key pair locally so messages encrypted to the
    //    old public key can still be decrypted after rotation.
    await this.archiveCurrentKeys();

    // 4. Commit the rotation locally only after the backend confirmed it.
    this.keyPair = newKeyPair;
    this.isInitialized = true;
    localStorage.setItem(this.getStorageKey(), JSON.stringify({ publicKey, privateKey }));

    return {
      success: true,
      keyPair: { publicKey }
    };
  }

  async uploadRotatedPublicKey(keyData) {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Same E2EE rule as key registration: only the public key is sent.
      const response = await fetch(`${API_BASE_URL}/encryption/keys/rotate`, {
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
        throw new Error(data.message || 'Failed to rotate encryption keys');
      }

      this.backendKeys = data.keys;
      return true;
    } catch (error) {
      console.error('[EncryptionService] Failed to rotate keys:', error);
      throw error;
    }
  }

  getArchiveStorageKey() {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?._id) return `genz_e2ee_keypairs_history_v1_${u._id}`;
    } catch (_) {
      /* ignore */
    }
    return 'genz_e2ee_keypairs_history_v1_anon';
  }

  // Loads the private keys of previously rotated pairs from localStorage.
  // Used as a fallback in decryptMessage so old messages remain readable.
  async getArchivedPrivateKeys() {
    try {
      const raw = localStorage.getItem(this.getArchiveStorageKey());
      if (!raw) return [];
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries)) return [];

      const keys = [];
      for (const entry of entries) {
        if (entry?.privateKey) {
          try {
            keys.push(await ensureCrypto().importKey(
              'jwk',
              entry.privateKey,
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey']
            ));
          } catch {
            // Skip any archived entry that no longer imports cleanly.
          }
        }
      }
      return keys;
    } catch {
      return [];
    }
  }

  // Moves the current key pair into the rotation history before it is
  // overwritten. The archive is capped so browser storage stays bounded.
  async archiveCurrentKeys() {
    if (!this.keyPair) return;
    try {
      const subtle = ensureCrypto();
      const publicKey = await subtle.exportKey('jwk', this.keyPair.publicKey);
      const privateKey = await subtle.exportKey('jwk', this.keyPair.privateKey);

      const raw = localStorage.getItem(this.getArchiveStorageKey());
      const history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) return;

      history.unshift({
        publicKey,
        privateKey,
        rotatedAt: new Date().toISOString()
      });
      localStorage.setItem(this.getArchiveStorageKey(), JSON.stringify(history.slice(0, 10)));
    } catch (error) {
      console.warn('[EncryptionService] Failed to archive previous keys:', error);
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

  // Exports the active key pair plus the archived rotation history as a
  // single JSON document so keys can be moved between devices.
  async exportKeyStore() {
    const data = {
      exportedAt: new Date().toISOString(),
      current: null,
      history: []
    };
    try {
      if (this.keyPair) {
        const subtle = ensureCrypto();
        data.current = {
          publicKey: await subtle.exportKey('jwk', this.keyPair.publicKey),
          privateKey: await subtle.exportKey('jwk', this.keyPair.privateKey)
        };
      }
      const raw = localStorage.getItem(this.getArchiveStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) data.history = parsed;
      }
      return { success: true, data };
    } catch (error) {
      console.error('[EncryptionService] Failed to export key store:', error);
      throw error;
    }
  }

  // Imports a full key store (active pair + archived history) — e.g. from
  // another device. Registers the current public key with the backend so
  // peers can find it; private keys never leave the browser.
  async importKeyStore(data) {
    if (!data?.current?.publicKey || !data?.current?.privateKey) {
      throw new Error('Key store must include a current key pair');
    }

    const subtle = ensureCrypto();
    const [publicKey, privateKey] = await Promise.all([
      subtle.importKey('jwk', data.current.publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
      subtle.importKey('jwk', data.current.privateKey, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
    ]);

    this.keyPair = { publicKey, privateKey };
    this.isInitialized = true;
    localStorage.setItem(
      this.getStorageKey(),
      JSON.stringify({ publicKey: data.current.publicKey, privateKey: data.current.privateKey })
    );

    if (Array.isArray(data.history)) {
      localStorage.setItem(this.getArchiveStorageKey(), JSON.stringify(data.history.slice(0, 10)));
    }

    // Best effort: make sure the backend has this public key registered.
    await this.uploadKeysToBackend({ publicKey: data.current.publicKey });

    return {
      success: true,
      data: { publicKey: data.current.publicKey }
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

  async deriveMessageKey(peerPublicKey, privateKey = this.keyPair?.privateKey) {
    if (!privateKey) {
      throw new Error('Encryption service not initialized');
    }

    return ensureCrypto().deriveKey(
      {
        name: 'ECDH',
        public: await importPublicKey(peerPublicKey)
      },
      privateKey,
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

    const fingerprint = await computeKeyFingerprint(encryptedData.senderPublicKey);

    // Fast path: try the current private key first.
    try {
      const key = await this.deriveMessageKey(encryptedData.senderPublicKey, this.keyPair.privateKey);
      const plaintext = await ensureCrypto().decrypt(
        { name: 'AES-GCM', iv: fromBase64(encryptedData.iv) },
        key,
        fromBase64(encryptedData.ciphertext)
      );
      return {
        success: true,
        decryptedData: decoder.decode(plaintext),
        fingerprint
      };
    } catch (error) {
      // Fall through to archived keys from previous rotations.
    }

    // Older messages were encrypted to a previous public key, so try each
    // archived private key in turn until one authenticates.
    for (const privateKey of await this.getArchivedPrivateKeys()) {
      try {
        const key = await this.deriveMessageKey(encryptedData.senderPublicKey, privateKey);
        const plaintext = await ensureCrypto().decrypt(
          { name: 'AES-GCM', iv: fromBase64(encryptedData.iv) },
          key,
          fromBase64(encryptedData.ciphertext)
        );
        return {
          success: true,
          decryptedData: decoder.decode(plaintext)
        };
      } catch (error) {
        // Wrong key — keep trying older pairs.
      }
    }

    throw new Error('Failed to decrypt message with current or archived keys');
  }

  async getUserPublicKeys(userId) {
    try {
      const token = getAuthToken();
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
      const token = getAuthToken();
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

  // Fetches a sender's key history from the backend (cached per session) and
  // classifies the key that encrypted a message: 'current' (matches the
  // registered key), 'old' (matches a rotated key in the backend's
  // encryptionKeyHistory) or 'unknown'.
  async classifySenderKey(senderId, senderPublicKey) {
    if (!senderId || !senderPublicKey) return 'unknown';
    try {
      let history = this._keyHistoryCache.get(String(senderId));
      if (!history) {
        const token = getAuthToken();
        if (!token) return 'unknown';
        const response = await fetch(`${API_BASE_URL}/encryption/keys/history/${encodeURIComponent(senderId)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.history) return 'unknown';
        history = data.history;
        this._keyHistoryCache.set(String(senderId), history);
      }
      return classifyKeyAgainstHistory(senderPublicKey, history);
    } catch (error) {
      console.warn('[EncryptionService] Failed to classify sender key:', error);
      return 'unknown';
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
    this._keyHistoryCache.clear();
  }
}

const encryptionService = new EncryptionService();

export default encryptionService;
export { EncryptionService };
