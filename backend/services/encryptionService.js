const User = require('../models/User');

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
 * Handles end-to-end encryption key management.
 *
 * SECURITY NOTE: The server-side encryption helpers (generateUserKeys,
 * encryptForRecipient, decryptFromSender, encryptForGroup) were REMOVED.
 * The server must never generate or use users' private keys — that would
 * defeat end-to-end encryption. All key generation and message crypto now
 * happens client-side (frontend/src/services/encryptionService.js); the
 * server only stores the public keys clients register and serves them back
 * to other clients.
 */

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
      return {
        publicKey: null,
        signaturePublicKey: null
      };
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
 * Rotate a user's encryption keys using a client-generated key pair.
 * Mirrors registerClientPublicKeys: the client generates the new keys in
 * the browser and sends only its public keys — the server never generates
 * or stores private keys.
 * @param {string} userId - User ID
 * @param {Object} keys - Client-generated public keys { publicKey, signaturePublicKey }
 * @returns {Promise<Object>} Stored public keys
 */
const rotateKeys = async (userId, keys = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!keys.publicKey) {
      throw new Error('Public key is required');
    }

    // Move the previous public keys into the rotation history.
    if (user.encryptionKeys && user.encryptionKeys.publicKey) {
      if (!user.encryptionKeyHistory) {
        user.encryptionKeyHistory = [];
      }

      user.encryptionKeyHistory.push({
        publicKey: user.encryptionKeys.publicKey,
        signaturePublicKey: user.encryptionKeys.signaturePublicKey,
        rotatedAt: new Date()
      });
    }

    // Store only the client-provided public keys — never private keys.
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

/**
 * Get a user's encryption key history (current + previously rotated public
 * keys). Public keys only — never private keys. Used by clients to
 * fingerprint which key encrypted a message (current vs old).
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { currentPublicKey, history: [{ publicKey, rotatedAt }] }
 */
const getKeyHistory = async (userId) => {
  try {
    const user = await User.findById(userId).select('encryptionKeys encryptionKeyHistory');
    if (!user) {
      throw new Error('User not found');
    }

    return {
      currentPublicKey: user.encryptionKeys?.publicKey
        ? normalizeStoredPublicKey(user.encryptionKeys.publicKey)
        : null,
      history: (user.encryptionKeyHistory || []).map((entry) => ({
        publicKey: normalizeStoredPublicKey(entry.publicKey),
        rotatedAt: entry.rotatedAt || null
      }))
    };
  } catch (error) {
    console.error('[EncryptionService] Get key history failed:', error);
    throw error;
  }
};

module.exports = {
  registerClientPublicKeys,
  getUserPublicKeys,
  getKeyHistory,
  verifySignature,
  rotateKeys,
  deleteKeys,
  hasEncryptionKeys
};
