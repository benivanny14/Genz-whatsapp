const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearAllFakeData,
  createFakeChat,
  deleteFakeChat,
  getFakeChatSettings,
  getFakeChats,
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

module.exports = router;
