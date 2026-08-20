const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPremiumAccess } = require('../middleware/premiumAccess');
const {
  clearAllFakeData,
  createFakeChat,
  deleteFakeChat,
  getFakeChatSettings,
  getFakeChats,
  getPremadeConversations,
  getPremadeConversationDetail,
  resetFakeChatSettings,
  toggleFakeChat,
  updateFakeChatSettings,
} = require('../controllers/fakeChatController');

router.use(protect);
router.use(checkPremiumAccess);

router.get('/settings', getFakeChatSettings);
router.post('/settings', updateFakeChatSettings);
router.post('/create', createFakeChat);
router.get('/chats', getFakeChats);
router.delete('/chat/:id', deleteFakeChat);
router.post('/toggle', toggleFakeChat);
router.delete('/clear-all', clearAllFakeData);
router.post('/reset', resetFakeChatSettings);
router.get('/premade', getPremadeConversations);
router.get('/premade/:id', getPremadeConversationDetail);

module.exports = router;
