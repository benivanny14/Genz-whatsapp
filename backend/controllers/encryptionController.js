const {
  getUserPublicKeys,
  rotateKeys,
  deleteKeys,
  hasEncryptionKeys,
  registerClientPublicKeys
} = require('../services/encryptionService');

/**
 * Encryption Controller
 * Handles end-to-end encryption key management.
 *
 * NOTE: The legacy server-side encryption endpoints were removed — the server
 * must never generate or use users' private keys, otherwise end-to-end
 * encryption is meaningless. Removed: POST /keys/generate (generateKeys),
 * POST /encrypt (encryptMessage), POST /decrypt (decryptMessage) and
 * POST /encrypt/group (encryptGroupMessage). All crypto happens client-side
 * (frontend/src/services/encryptionService.js); the server only stores the
 * public keys clients register here.
 */

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

// @desc    Rotate encryption keys with a client-generated key pair
// @route   POST /api/encryption/keys/rotate
// @access  Private
exports.rotateKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicKey, signaturePublicKey } = req.body;

    const keys = await rotateKeys(userId, { publicKey, signaturePublicKey });

    res.status(200).json({
      success: true,
      message: 'Encryption keys rotated successfully',
      keys
    });
  } catch (error) {
    console.error('[EncryptionController] Rotate keys failed:', error);
    res.status(400).json({
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
