const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearAllFakeData,
  createFakeCall,
  createFakeChat,
  deleteFakeCall,
  deleteFakeChat,
  getFakeCalls,
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
router.post('/call', createFakeCall);
router.get('/chats', getFakeChats);
router.get('/calls', getFakeCalls);
router.delete('/chat/:id', deleteFakeChat);
router.delete('/call/:id', deleteFakeCall);
router.post('/toggle', toggleFakeChat);
router.delete('/clear-all', clearAllFakeData);
router.post('/reset', resetFakeChatSettings);

module.exports = router;
