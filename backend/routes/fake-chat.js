const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  applyFakeCover,
  clearAllFakeData,
  createFakeChat,
  createFromTemplate,
  deleteFakeChat,
  getFakeChatSettings,
  getFakeChats,
  getPremadeConversations,
  resetFakeChatSettings,
  toggleFakeChat,
  updateFakeChatSettings,
} = require('../controllers/fakeChatController');

router.use(protect);

router.get('/settings', getFakeChatSettings);
router.post('/settings', updateFakeChatSettings);
router.post('/create', createFakeChat);
router.get('/chats', getFakeChats);
router.delete('/chat/:id', deleteFakeChat);
router.post('/toggle', toggleFakeChat);
router.delete('/clear-all', clearAllFakeData);
router.post('/reset', resetFakeChatSettings);
router.get('/premade', getPremadeConversations);
router.post('/create-from-template', createFromTemplate);
router.post('/apply-cover', applyFakeCover);

module.exports = router;
