const express = require('express');
const router = express.Router();
const {
  updateGenzModsSettings,
  getGenzModsSettings,
  getDeletedMessages,
  restoreDeletedMessage,
  processAutoReply,
  getAutoReply,
  getUserStatus,
  updateGhostMode,
  getMessageTracking,
  updateReadReceipts,
  updateTypingIndicators,
  updateOnlineStatus,
  freezeLastSeen,
  getModStats,
  exportModSettings,
  importModSettings
} = require('../controllers/genzModsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.put('/settings', updateGenzModsSettings);
router.get('/settings', getGenzModsSettings);
router.get('/deleted-messages', getDeletedMessages);
router.post('/restore-message/:id', restoreDeletedMessage);
router.post('/auto-reply', processAutoReply);
router.get('/auto-reply', getAutoReply);
router.get('/user-status/:userId', getUserStatus);
router.put('/ghost-mode', updateGhostMode);
router.get('/message-tracking/:messageId', getMessageTracking);
router.put('/read-receipts', updateReadReceipts);
router.put('/typing-indicators', updateTypingIndicators);
router.put('/online-status', updateOnlineStatus);
router.put('/freeze-last-seen', freezeLastSeen);
router.get('/stats', getModStats);
router.get('/export', exportModSettings);
router.post('/import', importModSettings);

module.exports = router;
