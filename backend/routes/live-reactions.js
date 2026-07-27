const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  cleanupExpiredReactions,
  getAvailableReactions,
  getLiveReactionsSettings,
  getMessageReactions,
  removeLiveReaction,
  resetLiveReactionsSettings,
  sendLiveReaction,
  toggleLiveReactions,
  updateLiveReactionsSettings,
} = require('../controllers/liveReactionsController');

router.use(protect);

router.get('/settings', getLiveReactionsSettings);
router.post('/settings', updateLiveReactionsSettings);
router.post('/message/:messageId', sendLiveReaction);
router.get('/message/:messageId', getMessageReactions);
router.delete('/message/:messageId/:reactionId', removeLiveReaction);
router.get('/available', getAvailableReactions);
router.post('/cleanup', cleanupExpiredReactions);
router.post('/toggle', toggleLiveReactions);
router.post('/reset', resetLiveReactionsSettings);

module.exports = router;
