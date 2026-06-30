const crypto = require('crypto');

/**
 * End-to-End Encryption Configuration
 * Handles encryption keys, key derivation, and cryptographic operations
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ALGORITHM = 'sha256';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generate a random key
 * @param {number} length - Key length in bytes
 * @returns {Buffer} Random key
 */
const generateKey = (length = KEY_LENGTH) => {
  return crypto.randomBytes(length);
};

/**
 * Generate a random IV
 * @returns {Buffer} Random IV
 */
const generateIV = () => {
  return crypto.randomBytes(IV_LENGTH);
};

/**
 * Derive a key from a password using PBKDF2
 * @param {string} password - Password
 * @param {Buffer} salt - Salt
 * @param {number} iterations - Number of iterations
 * @returns {Promise<Buffer>} Derived key
 */
const deriveKey = async (password, salt, iterations = 100000) => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, KEY_LENGTH, KEY_DERIVATION_ALGORITHM, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Buffer} plaintext - Data to encrypt
 * @param {Buffer} key - Encryption key
 * @returns {Object} Encrypted data with IV and auth tag
 */
const encrypt = (plaintext, key) => {
  try {
    const iv = generateIV();
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted;
    if (Buffer.isBuffer(plaintext)) {
      encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    } else {
      encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    }
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    console.error('[Encryption] Encrypt error:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encrypted - Base64 encoded encrypted data
 * @param {string} iv - Base64 encoded IV
 * @param {string} authTag - Base64 encoded auth tag
 * @param {Buffer} key - Decryption key
 * @returns {Buffer} Decrypted data
 */
const decrypt = (encrypted, iv, authTag, key) => {
  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decrypt error:', error);
    throw new Error('Decryption failed');
  }
};

/**
 * Generate a key pair for asymmetric encryption (X25519)
 * @returns {Object} Key pair with public and private keys
 */
const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' })
  };
};

/**
 * Derive shared secret using X25519
 * @param {string} privateKey - Private key in PEM format
 * @param {string} publicKey - Public key in PEM format
 * @returns {Buffer} Shared secret
 */
const deriveSharedSecret = (privateKey, publicKey) => {
  try {
    const privKey = crypto.createPrivateKey(privateKey);
    const pubKey = crypto.createPublicKey(publicKey);
    
    const sharedSecret = crypto.diffieHellman({
      privateKey: privKey,
      publicKey: pubKey
    });
    
    return sharedSecret;
  } catch (error) {
    console.error('[Encryption] Derive shared secret error:', error);
    throw new Error('Failed to derive shared secret');
  }
};

/**
 * Sign data using Ed25519
 * @param {string|Buffer} data - Data to sign
 * @param {string} privateKey - Private key in PEM format
 * @returns {string} Base64 encoded signature
 */
const sign = (data, privateKey) => {
  try {
    const sign = crypto.createSign('SHA256');
    sign.update(Buffer.isBuffer(data) ? data : data);
    sign.end();
    
    const signature = sign.sign(privateKey);
    return signature.toString('base64');
  } catch (error) {
    console.error('[Encryption] Sign error:', error);
    throw new Error('Signing failed');
  }
};

/**
 * Verify signature using Ed25519
 * @param {string|Buffer} data - Data to verify
 * @param {string} signature - Base64 encoded signature
 * @param {string} publicKey - Public key in PEM format
 * @returns {boolean} True if signature is valid
 */
const verify = (data, signature, publicKey) => {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(Buffer.isBuffer(data) ? data : data);
    verify.end();
    
    return verify.verify(publicKey, Buffer.from(signature, 'base64'));
  } catch (error) {
    console.error('[Encryption] Verify error:', error);
    return false;
  }
};

/**
 * Generate a signature key pair (Ed25519)
 * @returns {Object} Key pair with public and private keys
 */
const generateSignatureKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' })
  };
};

/**
 * Hash data using SHA-256
 * @param {string|Buffer} data - Data to hash
 * @returns {string} Hex encoded hash
 */
const hash = (data) => {
  return crypto
    .createHash('sha256')
    .update(Buffer.isBuffer(data) ? data : data)
    .digest('hex');
};

/**
 * Generate a random session ID
 * @returns {string} Random session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt message for a specific recipient
 * @param {string} message - Message to encrypt
 * @param {string} recipientPublicKey - Recipient's public key
 * @param {string} senderPrivateKey - Sender's private key
 * @returns {Object} Encrypted message with metadata
 */
const encryptMessage = (message, recipientPublicKey, senderPrivateKey) => {
  try {
    // Derive shared secret
    const sharedSecret = deriveSharedSecret(senderPrivateKey, recipientPublicKey);
    
    // Derive encryption key from shared secret
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(sharedSecret, salt, 100000, KEY_LENGTH, KEY_DERIVATION_ALGORITHM);
    
    // Encrypt message
    const encrypted = encrypt(message, key);
    
    // Sign the encrypted message
    const signatureKeyPair = generateSignatureKeyPair();
    const signature = sign(encrypted.encrypted, signatureKeyPair.privateKey);
    
    return {
      encrypted: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      salt: salt.toString('base64'),
      signature: signature,
      signaturePublicKey: signatureKeyPair.publicKey
    };
  } catch (error) {
    console.error('[Encryption] Encrypt message error:', error);
    throw new Error('Message encryption failed');
  }
};

/**
 * Decrypt message from a specific sender
 * @param {Object} encryptedMessage - Encrypted message object
 * @param {string} senderPublicKey - Sender's public key
 * @param {string} recipientPrivateKey - Recipient's private key
 * @returns {string} Decrypted message
 */
const decryptMessage = (encryptedMessage, senderPublicKey, recipientPrivateKey) => {
  try {
    // Derive shared secret
    const sharedSecret = deriveSharedSecret(recipientPrivateKey, senderPublicKey);
    
    // Derive encryption key from shared secret
    const salt = Buffer.from(encryptedMessage.salt, 'base64');
    const key = crypto.pbkdf2Sync(sharedSecret, salt, 100000, KEY_LENGTH, KEY_DERIVATION_ALGORITHM);
    
    // Verify signature if present
    if (encryptedMessage.signature && encryptedMessage.signaturePublicKey) {
      const isValid = verify(
        encryptedMessage.encrypted,
        encryptedMessage.signature,
        encryptedMessage.signaturePublicKey
      );
      if (!isValid) {
        throw new Error('Invalid signature');
      }
    }
    
    // Decrypt message
    const decrypted = decrypt(
      encryptedMessage.encrypted,
      encryptedMessage.iv,
      encryptedMessage.authTag,
      key
    );
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Encryption] Decrypt message error:', error);
    throw new Error('Message decryption failed');
  }
};

module.exports = {
  generateKey,
  generateIV,
  deriveKey,
  encrypt,
  decrypt,
  generateKeyPair,
  deriveSharedSecret,
  sign,
  verify,
  generateSignatureKeyPair,
  hash,
  generateSessionId,
  encryptMessage,
  decryptMessage,
  ENCRYPTION_ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH
};
