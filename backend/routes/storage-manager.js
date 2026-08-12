const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  cleanupOldMedia,
  cleanupOldMessages,
  clearCache,
  compressStorage,
  getConversationBreakdown,
  getStorageManagerSettings,
  getStorageUsage,
  resetStorageManagerSettings,
  toggleAutoCleanup,
  updateStorageManagerSettings,
} = require('../controllers/storageToolsController');

router.use(protect);

router.get('/settings', getStorageManagerSettings);
router.post('/settings', updateStorageManagerSettings);
router.get('/usage', getStorageUsage);
router.post('/cleanup-messages', cleanupOldMessages);
router.post('/cleanup-media', cleanupOldMedia);
router.post('/clear-cache', clearCache);
router.post('/compress', compressStorage);
router.get('/conversation-breakdown', getConversationBreakdown);
router.post('/auto-cleanup', toggleAutoCleanup);
router.post('/reset', resetStorageManagerSettings);

module.exports = router;
