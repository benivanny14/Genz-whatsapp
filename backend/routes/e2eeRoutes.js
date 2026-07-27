const express = require('express');
const router = express.Router();
const {
  generateKeys,
  getPublicKey,
  encryptMessage,
  decryptMessage,
  generateSafetyNumber,
  rotateKeys,
  getKeyStatus
} = require('../controllers/e2eeController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Key management
router.post('/keys', generateKeys);
router.get('/keys/:userId', getPublicKey);
router.get('/status', getKeyStatus);
router.post('/rotate-keys', rotateKeys);

// Encryption/Decryption
router.post('/encrypt', encryptMessage);
router.post('/decrypt', decryptMessage);

// Safety number verification
router.get('/safety-number/:otherUserId', generateSafetyNumber);

module.exports = router;