const User = require('../models/User');
const {
  generateKeyPair,
  generateSignatureKeyPair,
  encryptMessage,
  decryptMessage,
  hash
} = require('../config/encryption');

function normalizeStoredPublicKey(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  const s = String(value).trim();
  if (s.startsWith('{') && s.includes('"kty"')) {
    try {
      return JSON.parse(s);
    } catch {
      return value;
    }
  }
  return value;
}

function serializeIncomingPublicKey(pk) {
  if (pk == null) return pk;
  if (typeof pk === 'object') return JSON.stringify(pk);
  return String(pk);
}

/**
 * Encryption Service
 * Handles end-to-end encryption key management and message encryption/decryption
 */

/**
 * Generate and store encryption keys for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated keys
 */
const generateUserKeys = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate encryption key pair (X25519)
    const keyPair = generateKeyPair();
    
    // Generate signature key pair (Ed25519)
    const signatureKeyPair = generateSignatureKeyPair();

    // Store keys in user document
    user.encryptionKeys = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      signaturePublicKey: signatureKeyPair.publicKey,
      signaturePrivateKey: signatureKeyPair.privateKey
    };

    await user.save();

    return {
      publicKey: user.encryptionKeys.publicKey,
      signaturePublicKey: user.encryptionKeys.signaturePublicKey
    };
  } catch (error) {
    console.error('[EncryptionService] Generate user keys failed:', error);
    throw error;
  }
};

const registerClientPublicKeys = async (userId, keys = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!keys.publicKey) {
      throw new Error('Public key is required');
    }

    if (!user.encryptionKeys) {
      user.encryptionKeys = {};
    }

    user.encryptionKeys.publicKey = serializeIncomingPublicKey(keys.publicKey);
    if (keys.signaturePublicKey) {
      user.encryptionKeys.signaturePublicKey = serializeIncomingPublicKey(keys.signaturePublicKey);
    }

    user.encryptionKeys.privateKey = undefined;
    user.encryptionKeys.signaturePrivateKey = undefined;

    await user.save();

    return {
      publicKey: normalizeStoredPublicKey(user.encryptionKeys.publicKey),
      signaturePublicKey: user.encryptionKeys.signaturePublicKey
        ? normalizeStoredPublicKey(user.encryptionKeys.signaturePublicKey)
        : null
    };
  } catch (error) {
    console.error('[EncryptionService] Register client public keys failed:', error);
    throw error;
  }
};

/**
 * Get user's public keys
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Public keys
 */
const getUserPublicKeys = async (userId) => {
  try {
    const user = await User.findById(userId).select('encryptionKeys');
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.encryptionKeys || !user.encryptionKeys.publicKey) {
      throw new Error('Encryption keys not found for user');
    }

    return {
      publicKey: normalizeStoredPublicKey(user.encryptionKeys.publicKey),
      signaturePublicKey: user.encryptionKeys.signaturePublicKey
        ? normalizeStoredPublicKey(user.encryptionKeys.signaturePublicKey)
        : null
    };
  } catch (error) {
    console.error('[EncryptionService] Get user public keys failed:', error);
    throw error;
  }
};

/**
 * Encrypt message for a recipient
 * @param {string} message - Message to encrypt
 * @param {string} senderId - Sender user ID
 * @param {string} recipientId - Recipient user ID
 * @returns {Promise<Object>} Encrypted message
 */
const encryptForRecipient = async (message, senderId, recipientId) => {
  try {
    const [sender, recipient] = await Promise.all([
      User.findById(senderId).select('encryptionKeys'),
      User.findById(recipientId).select('encryptionKeys')
    ]);

    if (!sender || !recipient) {
      throw new Error('User not found');
    }

    if (!sender.encryptionKeys || !sender.encryptionKeys.privateKey) {
      throw new Error('Sender encryption keys not found');
    }

    if (!recipient.encryptionKeys || !recipient.encryptionKeys.publicKey) {
      throw new Error('Recipient encryption keys not found');
    }

    // Encrypt message
    const encrypted = encryptMessage(
      message,
      recipient.encryptionKeys.publicKey,
      sender.encryptionKeys.privateKey
    );

    return {
      encrypted: true,
      ...encrypted
    };
  } catch (error) {
    console.error('[EncryptionService] Encrypt for recipient failed:', error);
    throw error;
  }
};

/**
 * Decrypt message from a sender
 * @param {Object} encryptedMessage - Encrypted message object
 * @param {string} recipientId - Recipient user ID
 * @param {string} senderId - Sender user ID
 * @returns {Promise<string>} Decrypted message
 */
const decryptFromSender = async (encryptedMessage, recipientId, senderId) => {
  try {
    const [recipient, sender] = await Promise.all([
      User.findById(recipientId).select('encryptionKeys'),
      User.findById(senderId).select('encryptionKeys')
    ]);

    if (!recipient || !sender) {
      throw new Error('User not found');
    }

    if (!recipient.encryptionKeys || !recipient.encryptionKeys.privateKey) {
      throw new Error('Recipient encryption keys not found');
    }

    if (!sender.encryptionKeys || !sender.encryptionKeys.publicKey) {
      throw new Error('Sender encryption keys not found');
    }

    // Decrypt message
    const decrypted = decryptMessage(
      encryptedMessage,
      sender.encryptionKeys.publicKey,
      recipient.encryptionKeys.privateKey
    );

    return decrypted;
  } catch (error) {
    console.error('[EncryptionService] Decrypt from sender failed:', error);
    throw error;
  }
};

/**
 * Encrypt group message for multiple recipients
 * @param {string} message - Message to encrypt
 * @param {string} senderId - Sender user ID
 * @param {Array<string>} recipientIds - Recipient user IDs
 * @returns {Promise<Object>} Encrypted message for each recipient
 */
const encryptForGroup = async (message, senderId, recipientIds) => {
  try {
    const sender = await User.findById(senderId).select('encryptionKeys');
    if (!sender) {
      throw new Error('Sender not found');
    }

    if (!sender.encryptionKeys || !sender.encryptionKeys.privateKey) {
      throw new Error('Sender encryption keys not found');
    }

    const recipients = await User.find({ _id: { $in: recipientIds } }).select('encryptionKeys');
    
    const encryptedMessages = {};
    
    for (const recipient of recipients) {
      if (!recipient.encryptionKeys || !recipient.encryptionKeys.publicKey) {
        console.warn(`[EncryptionService] Skipping recipient ${recipient._id} - no encryption keys`);
        continue;
      }

      const encrypted = encryptMessage(
        message,
        recipient.encryptionKeys.publicKey,
        sender.encryptionKeys.privateKey
      );

      encryptedMessages[recipient._id.toString()] = encrypted;
    }

    return {
      encrypted: true,
      messages: encryptedMessages
    };
  } catch (error) {
    console.error('[EncryptionService] Encrypt for group failed:', error);
    throw error;
  }
};

/**
 * Verify message signature
 * @param {string} encryptedData - Encrypted data
 * @param {string} signature - Signature
 * @param {string} signaturePublicKey - Signature public key
 * @returns {boolean} True if signature is valid
 */
const verifySignature = (encryptedData, signature, signaturePublicKey) => {
  try {
    const crypto = require('crypto');
    const verify = crypto.createVerify('SHA256');
    verify.update(encryptedData);
    verify.end();
    
    return verify.verify(signaturePublicKey, Buffer.from(signature, 'base64'));
  } catch (error) {
    console.error('[EncryptionService] Verify signature failed:', error);
    return false;
  }
};

/**
 * Rotate encryption keys for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} New public keys
 */
const rotateKeys = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new key pairs
    const keyPair = generateKeyPair();
    const signatureKeyPair = generateSignatureKeyPair();

    // Store old keys in history
    if (!user.encryptionKeyHistory) {
      user.encryptionKeyHistory = [];
    }

    if (user.encryptionKeys) {
      user.encryptionKeyHistory.push({
        publicKey: user.encryptionKeys.publicKey,
        signaturePublicKey: user.encryptionKeys.signaturePublicKey,
        rotatedAt: new Date()
      });
    }

    // Update with new keys
    user.encryptionKeys = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      signaturePublicKey: signatureKeyPair.publicKey,
      signaturePrivateKey: signatureKeyPair.privateKey
    };

    await user.save();

    return {
      publicKey: user.encryptionKeys.publicKey,
      signaturePublicKey: user.encryptionKeys.signaturePublicKey
    };
  } catch (error) {
    console.error('[EncryptionService] Rotate keys failed:', error);
    throw error;
  }
};

/**
 * Delete encryption keys for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteKeys = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.encryptionKeys = undefined;
    user.encryptionKeyHistory = undefined;
    await user.save();
  } catch (error) {
    console.error('[EncryptionService] Delete keys failed:', error);
    throw error;
  }
};

/**
 * Check if user has encryption keys
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if keys exist
 */
const hasEncryptionKeys = async (userId) => {
  try {
    const user = await User.findById(userId).select('encryptionKeys');
    return !!(user && user.encryptionKeys && user.encryptionKeys.publicKey);
  } catch (error) {
    console.error('[EncryptionService] Check encryption keys failed:', error);
    return false;
  }
};

module.exports = {
  generateUserKeys,
  registerClientPublicKeys,
  getUserPublicKeys,
  encryptForRecipient,
  decryptFromSender,
  encryptForGroup,
  verifySignature,
  rotateKeys,
  deleteKeys,
  hasEncryptionKeys
};
