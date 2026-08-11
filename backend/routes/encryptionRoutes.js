const express = require('express');
const router = express.Router();
const {
  getMyPublicKeys,
  getUserPublicKeys,
  getKeyHistory,
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
router.get('/keys/public', getMyPublicKeys);
router.post('/keys/public', registerPublicKeys);
router.get('/keys/public/:userId', getUserPublicKeys);
router.post('/keys/rotate', rotateKeys);
router.get('/keys/history/:userId', getKeyHistory);
router.delete('/keys', deleteKeys);
router.get('/keys/status', checkKeysStatus);
router.post('/keys/batch', batchGetPublicKeys);

// NOTE: The legacy server-side encryption endpoints were REMOVED:
//   POST /keys/generate, POST /encrypt, POST /decrypt, POST /encrypt/group
// They let the server generate and use users' private keys, which defeats
// end-to-end encryption. All crypto is now client-side only
// (frontend/src/services/encryptionService.js) — the server merely stores
// registered public keys. These routes must not be re-added.

module.exports = router;
