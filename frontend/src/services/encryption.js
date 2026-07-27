/**
 * Real End-to-End Encryption Service
 * Uses Web Crypto API for production-grade encryption
 * Inspired by Signal Protocol principles
 */

class EncryptionService {
  constructor() {
    this.keyPair = null;
    this.publicKeys = new Map(); // Store other users' public keys
    this.sessionKeys = new Map(); // Store session keys for conversations
    this.UNAUTHENTICATED_FALLBACK_USER_ID = '60d5ecb8b392cb371c664c12';
  }

  getLocalUserId() {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?._id) return String(u._id);
    } catch (_) { /* ignore */ }
    return this.UNAUTHENTICATED_FALLBACK_USER_ID;
  }

  // ── Generate RSA-OAEP Key Pair (Asymmetric) ─────────────────────────────
  async generateKeyPair() {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Store key pair in IndexedDB for persistence
      await this.storeKeyPair();
      
      return this.keyPair;
    } catch (error) {
      console.error('[Encryption] Failed to generate key pair:', error);
      throw error;
    }
  }

  // ── Generate AES-GCM Key (Symmetric for session) ───────────────────────
  async generateSessionKey() {
    try {
      const sessionKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      return sessionKey;
    } catch (error) {
      console.error('[Encryption] Failed to generate session key:', error);
      throw error;
    }
  }

  // ── Export Public Key to Base64 ─────────────────────────────────────────
  async exportPublicKey(key = this.keyPair?.publicKey) {
    if (!key) throw new Error('No public key available');
    
    try {
      const exported = await window.crypto.subtle.exportKey('spki', key);
      const exportedBase64 = this.arrayBufferToBase64(exported);
      return exportedBase64;
    } catch (error) {
      console.error('[Encryption] Failed to export public key:', error);
      throw error;
    }
  }

  // ── Import Public Key from Base64 ─────────────────────────────────────
  async importPublicKey(base64Key) {
    try {
      const keyData = this.base64ToArrayBuffer(base64Key);
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        true,
        ['encrypt']
      );

      return publicKey;
    } catch (error) {
      console.error('[Encryption] Failed to import public key:', error);
      throw error;
    }
  }

  // ── Encrypt Message with Recipient's Public Key ───────────────────────
  async encryptMessage(message, recipientPublicKey) {
    try {
      // Generate a random session key for this message
      const sessionKey = await this.generateSessionKey();
      
      // Encrypt the message with AES-GCM using the session key
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedMessage = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        sessionKey,
        messageData
      );

      // Encrypt the session key with recipient's RSA public key
      const exportedSessionKey = await window.crypto.subtle.exportKey('raw', sessionKey);
      const encryptedSessionKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        recipientPublicKey,
        exportedSessionKey
      );

      // Return package with encrypted message, encrypted session key, and IV
      return {
        encryptedMessage: this.arrayBufferToBase64(encryptedMessage),
        encryptedSessionKey: this.arrayBufferToBase64(encryptedSessionKey),
        iv: this.arrayBufferToBase64(iv)
      };
    } catch (error) {
      console.error('[Encryption] Failed to encrypt message:', error);
      throw error;
    }
  }

  // ── Decrypt Message with Private Key ───────────────────────────────────
  async decryptMessage(encryptedPackage) {
    try {
      const { encryptedMessage, encryptedSessionKey, iv } = encryptedPackage;
      
      if (!this.keyPair?.privateKey) {
        throw new Error('No private key available for decryption');
      }

      // Decrypt the session key with our private key
      const encryptedSessionKeyBuffer = this.base64ToArrayBuffer(encryptedSessionKey);
      const decryptedSessionKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        this.keyPair.privateKey,
        encryptedSessionKeyBuffer
      );

      // Import the decrypted session key
      const sessionKey = await window.crypto.subtle.importKey(
        'raw',
        decryptedSessionKeyBuffer,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Decrypt the message with the session key
      const encryptedMessageBuffer = this.base64ToArrayBuffer(encryptedMessage);
      const ivBuffer = this.base64ToArrayBuffer(iv);
      
      const decryptedMessage = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer
        },
        sessionKey,
        encryptedMessageBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedMessage);
    } catch (error) {
      console.error('[Encryption] Failed to decrypt message:', error);
      throw error;
    }
  }

  // ── Store Key Pair in IndexedDB ───────────────────────────────────────
  async storeKeyPair() {
    try {
      if (!this.keyPair) return;

      // Export both keys
      const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', this.keyPair.publicKey);
      const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', this.keyPair.privateKey);

      // Store in localStorage for simplicity (production should use IndexedDB)
      const keyPairData = {
        publicKey: publicKeyJwk,
        privateKey: privateKeyJwk,
        userId: this.getLocalUserId(),
        createdAt: Date.now()
      };

      localStorage.setItem('encryption_key_pair', JSON.stringify(keyPairData));
    } catch (error) {
      console.error('[Encryption] Failed to store key pair:', error);
    }
  }

  // ── Load Key Pair from Storage ─────────────────────────────────────────
  async loadKeyPair() {
    try {
      const stored = localStorage.getItem('encryption_key_pair');
      if (!stored) return null;

      const keyPairData = JSON.parse(stored);
      
      // Import keys
      const publicKey = await window.crypto.subtle.importKey(
        'jwk',
        keyPairData.publicKey,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        true,
        ['encrypt']
      );

      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        keyPairData.privateKey,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        true,
        ['decrypt']
      );

      this.keyPair = { publicKey, privateKey };
      return this.keyPair;
    } catch (error) {
      console.error('[Encryption] Failed to load key pair:', error);
      return null;
    }
  }

  // ── Store User's Public Key ───────────────────────────────────────────
  async storeUserPublicKey(userId, publicKeyBase64) {
    this.publicKeys.set(userId, publicKeyBase64);
    
    // Store in localStorage
    const storedKeys = JSON.parse(localStorage.getItem('user_public_keys') || '{}');
    storedKeys[userId] = publicKeyBase64;
    localStorage.setItem('user_public_keys', JSON.stringify(storedKeys));
  }

  // ── Get User's Public Key ──────────────────────────────────────────────
  async getUserPublicKey(userId) {
    // Check memory first
    if (this.publicKeys.has(userId)) {
      return await this.importPublicKey(this.publicKeys.get(userId));
    }

    // Check localStorage
    const storedKeys = JSON.parse(localStorage.getItem('user_public_keys') || '{}');
    if (storedKeys[userId]) {
      return await this.importPublicKey(storedKeys[userId]);
    }

    return null;
  }

  // ── Utility: ArrayBuffer to Base64 ───────────────────────────────────
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // ── Utility: Base64 to ArrayBuffer ───────────────────────────────────
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ── Initialize Encryption Service ─────────────────────────────────────
  async initialize() {
    try {
      // Try to load existing key pair
      const loaded = await this.loadKeyPair();
      if (loaded) {
        console.log('[Encryption] Loaded existing key pair');
        return true;
      }

      // Generate new key pair
      await this.generateKeyPair();
      console.log('[Encryption] Generated new key pair');
      return true;
    } catch (error) {
      console.error('[Encryption] Failed to initialize:', error);
      return false;
    }
  }

  // ── Get Current Public Key (Base64) ──────────────────────────────────
  async getMyPublicKey() {
    if (!this.keyPair) {
      await this.initialize();
    }
    return await this.exportPublicKey();
  }
}

export default new EncryptionService();
