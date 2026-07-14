const e2eeService = require('../services/e2eeService');
const User = require('../models/User');

/**
 * Generate encryption keys for a user
 * POST /api/e2ee/keys
 */
exports.generateKeys = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Generate new key pair
    const keyPair = await e2eeService.generateKeyPair();
    
    // Store public key in database
    await User.findByIdAndUpdate(userId, {
      'encryptionKeys.publicKey': keyPair.publicKey,
      'encryptionKeys.privateKey': keyPair.privateKey,
      'encryptionKeys.signaturePublicKey': keyPair.publicKey, // Using same key for signature
      'encryptionKeys.signaturePrivateKey': keyPair.privateKey
    });
    
    // Store in service for quick access
    e2eeService.storePublicKey(userId, keyPair.publicKey);
    
    console.log(`[E2EE] Keys generated for user ${userId}`);
    
    res.json({
      success: true,
      publicKey: keyPair.publicKey,
      // Never send private key in response - store it securely
      message: 'Encryption keys generated successfully'
    });
  } catch (error) {
    console.error('[E2EE] Generate keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate encryption keys'
    });
  }
};

/**
 * Get user's public key
 * GET /api/e2ee/keys/:userId
 */
exports.getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user from database
    const user = await User.findById(userId).select('encryptionKeys');
    
    if (!user || !user.encryptionKeys || !user.encryptionKeys.publicKey) {
      return res.status(404).json({
        success: false,
        message: 'User public key not found'
      });
    }
    
    res.json({
      success: true,
      publicKey: user.encryptionKeys.publicKey,
      userId
    });
  } catch (error) {
    console.error('[E2EE] Get public key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get public key'
    });
  }
};

/**
 * Encrypt a message
 * POST /api/e2ee/encrypt
 */
exports.encryptMessage = async (req, res) => {
  try {
    const { receiverId, plaintext } = req.body;
    const senderId = req.user._id.toString();
    
    if (!receiverId || !plaintext) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and plaintext are required'
      });
    }
    
    // Get sender's keys from database
    const sender = await User.findById(senderId).select('encryptionKeys');
    
    if (!sender || !sender.encryptionKeys || !sender.encryptionKeys.privateKey) {
      return res.status(400).json({
        success: false,
        message: 'Sender encryption keys not found. Please generate keys first.'
      });
    }
    
    // Get receiver's public key
    let receiverPublicKey = e2eeService.getPublicKey(receiverId);
    
    if (!receiverPublicKey) {
      // Try to get from database
      const receiver = await User.findById(receiverId).select('encryptionKeys');
      if (receiver && receiver.encryptionKeys && receiver.encryptionKeys.publicKey) {
        receiverPublicKey = receiver.encryptionKeys.publicKey;
        e2eeService.storePublicKey(receiverId, receiverPublicKey);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Receiver public key not found'
        });
      }
    }
    
    // Create encrypted message
    const encryptedPayload = e2eeService.createEncryptedMessage(
      senderId,
      receiverId,
      plaintext,
      sender.encryptionKeys.privateKey
    );
    
    res.json({
      success: true,
      encrypted: true,
      payload: encryptedPayload
    });
  } catch (error) {
    console.error('[E2EE] Encrypt message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to encrypt message'
    });
  }
};

/**
 * Decrypt a message
 * POST /api/e2ee/decrypt
 */
exports.decryptMessage = async (req, res) => {
  try {
    const { encryptedPayload } = req.body;
    const receiverId = req.user._id.toString();
    
    if (!encryptedPayload) {
      return res.status(400).json({
        success: false,
        message: 'Encrypted payload is required'
      });
    }
    
    // Get receiver's private key from database
    const receiver = await User.findById(receiverId).select('encryptionKeys');
    
    if (!receiver || !receiver.encryptionKeys || !receiver.encryptionKeys.privateKey) {
      return res.status(400).json({
        success: false,
        message: 'Receiver encryption keys not found'
      });
    }
    
    // Decrypt message
    const plaintext = e2eeService.decryptReceivedMessage(
      encryptedPayload,
      receiver.encryptionKeys.privateKey
    );
    
    res.json({
      success: true,
      decrypted: true,
      plaintext
    });
  } catch (error) {
    console.error('[E2EE] Decrypt message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt message'
    });
  }
};

/**
 * Generate safety number for key verification
 * GET /api/e2ee/safety-number/:otherUserId
 */
exports.generateSafetyNumber = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user._id.toString();
    
    // Get both users' public keys
    const user = await User.findById(userId).select('encryptionKeys');
    const otherUser = await User.findById(otherUserId).select('encryptionKeys');
    
    if (!user || !user.encryptionKeys || !user.encryptionKeys.publicKey) {
      return res.status(404).json({
        success: false,
        message: 'Your encryption keys not found'
      });
    }
    
    if (!otherUser || !otherUser.encryptionKeys || !otherUser.encryptionKeys.publicKey) {
      return res.status(404).json({
        success: false,
        message: 'Other user encryption keys not found'
      });
    }
    
    // Generate safety number
    const safetyNumber = e2eeService.generateSafetyNumber(
      user.encryptionKeys.publicKey,
      otherUser.encryptionKeys.publicKey
    );
    
    res.json({
      success: true,
      safetyNumber,
      userId,
      otherUserId
    });
  } catch (error) {
    console.error('[E2EE] Generate safety number error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate safety number'
    });
  }
};

/**
 * Rotate encryption keys
 * POST /api/e2ee/rotate-keys
 */
exports.rotateKeys = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Rotate keys
    const newKeyPair = await e2eeService.rotateKeys(userId);
    
    // Store new public key, keep old private key for decrypting old messages
    await User.findByIdAndUpdate(userId, {
      'encryptionKeys.publicKey': newKeyPair.publicKey,
      'encryptionKeys.privateKey': newKeyPair.privateKey,
      'encryptionKeys.signaturePublicKey': newKeyPair.publicKey,
      'encryptionKeys.signaturePrivateKey': newKeyPair.privateKey,
      $push: {
        'encryptionKeyHistory': {
          publicKey: newKeyPair.publicKey,
          signaturePublicKey: newKeyPair.publicKey,
          rotatedAt: new Date()
        }
      }
    });
    
    console.log(`[E2EE] Keys rotated for user ${userId}`);
    
    res.json({
      success: true,
      publicKey: newKeyPair.publicKey,
      message: 'Encryption keys rotated successfully'
    });
  } catch (error) {
    console.error('[E2EE] Rotate keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rotate encryption keys'
    });
  }
};

/**
 * Check if user has encryption keys
 * GET /api/e2ee/status
 */
exports.getKeyStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    const user = await User.findById(userId).select('encryptionKeys');
    
    const hasKeys = user && user.encryptionKeys && user.encryptionKeys.publicKey;
    
    res.json({
      success: true,
      hasKeys,
      userId
    });
  } catch (error) {
    console.error('[E2EE] Get key status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get key status'
    });
  }
};