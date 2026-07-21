const {
  generateUserKeys,
  getUserPublicKeys,
  encryptForRecipient,
  decryptFromSender,
  encryptForGroup,
  rotateKeys,
  deleteKeys,
  hasEncryptionKeys,
  registerClientPublicKeys
} = require('../services/encryptionService');

/**
 * Encryption Controller
 * Handles end-to-end encryption key management and message encryption/decryption
 */

// @desc    Generate encryption keys for current user
// @route   POST /api/encryption/keys/generate
// @access  Private
exports.generateKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const keys = await generateUserKeys(userId);

    res.status(200).json({
      success: true,
      message: 'Encryption keys generated successfully',
      keys
    });
  } catch (error) {
    console.error('[EncryptionController] Generate keys failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user's public keys
// @route   GET /api/encryption/keys/public
// @access  Private
exports.getMyPublicKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const keys = await getUserPublicKeys(userId);

    res.status(200).json({
      success: true,
      keys
    });
  } catch (error) {
    console.error('[EncryptionController] Get public keys failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register client-generated public keys without sending private keys
// @route   POST /api/encryption/keys/public
// @access  Private
exports.registerPublicKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicKey, signaturePublicKey } = req.body;

    const keys = await registerClientPublicKeys(userId, { publicKey, signaturePublicKey });

    res.status(200).json({
      success: true,
      message: 'Public encryption keys registered successfully',
      keys
    });
  } catch (error) {
    console.error('[EncryptionController] Register public keys failed:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get another user's public keys
// @route   GET /api/encryption/keys/public/:userId
// @access  Private
exports.getUserPublicKeys = async (req, res) => {
  try {
    const { userId } = req.params;
    const keys = await getUserPublicKeys(userId);

    res.status(200).json({
      success: true,
      keys
    });
  } catch (error) {
    console.error('[EncryptionController] Get user public keys failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Encrypt message for a recipient
// @route   POST /api/encryption/encrypt
// @access  Private
exports.encryptMessage = async (req, res) => {
  try {
    const { message, recipientId } = req.body;
    const senderId = req.user._id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
    }

    const encrypted = await encryptForRecipient(message, senderId, recipientId);

    res.status(200).json({
      success: true,
      encrypted
    });
  } catch (error) {
    console.error('[EncryptionController] Encrypt message failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Decrypt message from a sender
// @route   POST /api/encryption/decrypt
// @access  Private
exports.decryptMessage = async (req, res) => {
  try {
    const { encryptedMessage, senderId } = req.body;
    const recipientId = req.user._id;

    if (!encryptedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Encrypted message is required'
      });
    }

    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required'
      });
    }

    const decrypted = await decryptFromSender(encryptedMessage, recipientId, senderId);

    res.status(200).json({
      success: true,
      message: decrypted
    });
  } catch (error) {
    console.error('[EncryptionController] Decrypt message failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Encrypt message for group
// @route   POST /api/encryption/encrypt/group
// @access  Private
exports.encryptGroupMessage = async (req, res) => {
  try {
    const { message, recipientIds } = req.body;
    const senderId = req.user._id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipient IDs are required'
      });
    }

    const encrypted = await encryptForGroup(message, senderId, recipientIds);

    res.status(200).json({
      success: true,
      encrypted
    });
  } catch (error) {
    console.error('[EncryptionController] Encrypt group message failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Rotate encryption keys
// @route   POST /api/encryption/keys/rotate
// @access  Private
exports.rotateKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const keys = await rotateKeys(userId);

    res.status(200).json({
      success: true,
      message: 'Encryption keys rotated successfully',
      keys
    });
  } catch (error) {
    console.error('[EncryptionController] Rotate keys failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete encryption keys
// @route   DELETE /api/encryption/keys
// @access  Private
exports.deleteKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    await deleteKeys(userId);

    res.status(200).json({
      success: true,
      message: 'Encryption keys deleted successfully'
    });
  } catch (error) {
    console.error('[EncryptionController] Delete keys failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check if user has encryption keys
// @route   GET /api/encryption/keys/status
// @access  Private
exports.checkKeysStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const hasKeys = await hasEncryptionKeys(userId);

    res.status(200).json({
      success: true,
      hasKeys
    });
  } catch (error) {
    console.error('[EncryptionController] Check keys status failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Batch get public keys for multiple users
// @route   POST /api/encryption/keys/batch
// @access  Private
exports.batchGetPublicKeys = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs are required'
      });
    }

    const keysMap = {};
    for (const userId of userIds) {
      try {
        const keys = await getUserPublicKeys(userId);
        keysMap[userId] = keys;
      } catch (error) {
        keysMap[userId] = null;
      }
    }

    res.status(200).json({
      success: true,
      keys: keysMap
    });
  } catch (error) {
    console.error('[EncryptionController] Batch get public keys failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
