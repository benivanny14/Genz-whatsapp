const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearSearchHistory,
  deleteSearchHistoryItem,
  getChatSearchSettings,
  getPopularSearches,
  getSearchHistory,
  resetChatSearchSettings,
  searchConversations,
  searchMessagesInConversation,
  toggleChatSearch,
  updateChatSearchSettings,
} = require('../controllers/chatSearchController');

router.use(protect);

router.get('/settings', getChatSearchSettings);
router.post('/settings', updateChatSearchSettings);
router.post('/search', searchConversations);
router.post('/messages/:conversationId', searchMessagesInConversation);
router.get('/history', getSearchHistory);
router.delete('/history', clearSearchHistory);
router.delete('/history/:query', deleteSearchHistoryItem);
router.get('/popular', getPopularSearches);
router.post('/toggle', toggleChatSearch);
router.post('/reset', resetChatSearchSettings);

module.exports = router;
