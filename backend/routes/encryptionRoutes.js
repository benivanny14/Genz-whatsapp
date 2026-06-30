const express = require('express');
const router = express.Router();
const {
  generateKeys,
  getMyPublicKeys,
  getUserPublicKeys,
  encryptMessage,
  decryptMessage,
  encryptGroupMessage,
  rotateKeys,
  deleteKeys,
  checkKeysStatus,
  batchGetPublicKeys,
  registerPublicKeys
} = require('../controllers/encryptionController');
const { protect } = require('../middleware/auth');

// All encryption routes require authentication
router.use(protect);

// Key management routes
router.post('/keys/generate', generateKeys);
router.get('/keys/public', getMyPublicKeys);
router.post('/keys/public', registerPublicKeys);
router.get('/keys/public/:userId', getUserPublicKeys);
router.post('/keys/rotate', rotateKeys);
router.delete('/keys', deleteKeys);
router.get('/keys/status', checkKeysStatus);
router.post('/keys/batch', batchGetPublicKeys);

// Message encryption/decryption routes
router.post('/encrypt', encryptMessage);
router.post('/decrypt', decryptMessage);
router.post('/encrypt/group', encryptGroupMessage);

module.exports = router;
