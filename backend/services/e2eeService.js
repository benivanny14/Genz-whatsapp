/**
 * End-to-End Encryption Service
 * Implements WebCrypto API for secure message encryption
 * Uses ECDH for key exchange and AES-GCM for message encryption
 */

const crypto = require('crypto');

class E2EEService {
  constructor() {
    // In-memory storage for public keys (in production, use Redis/Database)
    this.publicKeys = new Map();
    this.sessionKeys = new Map();
  }

  /**
   * Generate a new key pair for a user
   * Returns public key (to share) and private key (to keep secret)
   */
  async generateKeyPair() {
    try {
      // Using Node.js crypto for ECDH
      const ecKey = crypto.createECDH('prime256v1'); // P-256 curve
      ecKey.generateKeys();
      
      return {
        publicKey: ecKey.getPublicKey('hex'),
        privateKey: ecKey.getPrivateKey('hex'),
        curve: 'prime256v1',
        algorithm: 'ECDH'
      };
    } catch (error) {
      console.error('[E2EE] Error generating key pair:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  /**
   * Store user's public key
   */
  storePublicKey(userId, publicKey) {
    this.publicKeys.set(userId, {
      key: publicKey,
      timestamp: Date.now()
    });
  }

  /**
   * Get user's public key
   */
  getPublicKey(userId) {
    const stored = this.publicKeys.get(userId);
    return stored ? stored.key : null;
  }

  /**
   * Derive shared secret between two users
   * Uses ECDH to create a shared secret from private key and other's public key
   */
  deriveSharedSecret(privateKeyHex, publicKeyHex) {
    try {
      const ecKey = crypto.createECDH('prime256v1');
      ecKey.setPrivateKey(Buffer.from(privateKeyHex, 'hex'));
      const sharedSecret = ecKey.computeSecret(Buffer.from(publicKeyHex, 'hex'), 'hex', 'hex');
      return sharedSecret;
    } catch (error) {
      console.error('[E2EE] Error deriving shared secret:', error);
      throw new Error('Failed to derive shared secret');
    }
  }

  /**
   * Encrypt message using AES-GCM
   * Returns ciphertext, iv, and authTag
   */
  encryptMessage(plaintext, keyHex) {
    try {
      // Use SHA-256 to derive a 256-bit key from the shared secret
      const keyBuffer = crypto.createHash('sha256').update(Buffer.from(keyHex, 'hex')).digest();
      
      // Generate random IV
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      
      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag().toString('hex');
      
      return {
        ciphertext,
        iv: iv.toString('hex'),
        authTag,
        algorithm: 'AES-256-GCM'
      };
    } catch (error) {
      console.error('[E2EE] Error encrypting message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message using AES-GCM
   */
  decryptMessage(encryptedData, keyHex) {
    try {
      const { ciphertext, iv, authTag } = encryptedData;
      
      // Use SHA-256 to derive a 256-bit key from the shared secret
      const keyBuffer = crypto.createHash('sha256').update(Buffer.from(keyHex, 'hex')).digest();
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      // Decrypt
      let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } catch (error) {
      console.error('[E2EE] Error decrypting message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate a safety number for key verification
   * Users can compare safety numbers to verify their keys haven't been tampered with
   */
  generateSafetyNumber(localPublicKey, remotePublicKey) {
    try {
      // Combine both public keys and hash them
      const combined = localPublicKey + remotePublicKey;
      const hash = crypto.createHash('sha256').update(combined).digest('hex');
      
      // Format as groups of 4 characters for easy comparison
      const formatted = hash.match(/.{1,4}/g).join(' ');
      return formatted.toUpperCase();
    } catch (error) {
      console.error('[E2EE] Error generating safety number:', error);
      throw new Error('Failed to generate safety number');
    }
  }

  /**
   * Create encrypted message payload
   * Includes sender info, timestamp, and encrypted content
   */
  createEncryptedMessage(senderId, receiverId, plaintext, senderPrivateKey) {
    try {
      // Get receiver's public key
      const receiverPublicKey = this.getPublicKey(receiverId);
      if (!receiverPublicKey) {
        throw new Error('Receiver public key not found');
      }
      
      // Derive shared secret
      const sharedSecret = this.deriveSharedSecret(senderPrivateKey, receiverPublicKey);
      
      // Encrypt message
      const encrypted = this.encryptMessage(plaintext, sharedSecret);
      
      // Create message payload
      const payload = {
        senderId,
        receiverId,
        encrypted: true,
        content: encrypted,
        timestamp: Date.now(),
        algorithm: 'ECDH-AES-256-GCM',
        version: '1.0'
      };
      
      return payload;
    } catch (error) {
      console.error('[E2EE] Error creating encrypted message:', error);
      throw new Error('Failed to create encrypted message');
    }
  }

  /**
   * Decrypt received message
   */
  decryptReceivedMessage(encryptedPayload, receiverPrivateKey) {
    try {
      const { senderId, content, algorithm } = encryptedPayload;
      
      if (!encryptedPayload.encrypted) {
        // Message is not encrypted, return as-is
        return encryptedPayload.content;
      }
      
      // Get sender's public key
      const senderPublicKey = this.getPublicKey(senderId);
      if (!senderPublicKey) {
        throw new Error('Sender public key not found');
      }
      
      // Derive shared secret
      const sharedSecret = this.deriveSharedSecret(receiverPrivateKey, senderPublicKey);
      
      // Decrypt message
      const plaintext = this.decryptMessage(content, sharedSecret);
      
      return plaintext;
    } catch (error) {
      console.error('[E2EE] Error decrypting received message:', error);
      throw new Error('Failed to decrypt received message');
    }
  }

  /**
   * Rotate keys (for forward secrecy)
   * Generates new key pair and invalidates old one
   */
  async rotateKeys(userId) {
    try {
      const newKeyPair = await this.generateKeyPair();
      
      // Store new public key
      this.storePublicKey(userId, newKeyPair.publicKey);
      
      // In production, mark old keys as expired
      console.log(`[E2EE] Keys rotated for user ${userId}`);
      
      return newKeyPair;
    } catch (error) {
      console.error('[E2EE] Error rotating keys:', error);
      throw new Error('Failed to rotate keys');
    }
  }

  /**
   * Clean up expired keys (run periodically)
   */
  cleanup() {
    const now = Date.now();
    const expiryTime = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    for (const [userId, data] of this.publicKeys.entries()) {
      if (now - data.timestamp > expiryTime) {
        this.publicKeys.delete(userId);
        console.log(`[E2EE] Cleaned up expired key for user ${userId}`);
      }
    }
  }
}

// Create singleton instance
const e2eeService = new E2EEService();

// Run cleanup every hour
setInterval(() => e2eeService.cleanup(), 60 * 60 * 1000);

module.exports = e2eeService;