const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearAllChats,
  createPoll,
  downloadStatus,
  exportChat,
  getQuickActionsSettings,
  jumpToDate,
  resetQuickActionsSettings,
  sendMassMessage,
  updateQuickActionsSettings,
} = require('../controllers/quickActionsController');

router.use(protect);

// Root GET — alias to /settings for convenience
router.get('/', getQuickActionsSettings);
router.get('/settings', getQuickActionsSettings);
router.post('/settings', updateQuickActionsSettings);
router.post('/mass-message', sendMassMessage);
router.post('/export-chat', exportChat);
router.post('/clear-all-chats', clearAllChats);
router.post('/jump-to-date', jumpToDate);
router.post('/create-poll', createPoll);
router.post('/download-status', downloadStatus);
router.post('/reset', resetQuickActionsSettings);

module.exports = router;
