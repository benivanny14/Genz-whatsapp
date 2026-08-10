const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearCustomSortOrder,
  getChatSortSettings,
  getCustomSortOrder,
  resetChatSortSettings,
  saveCustomSortOrder,
  sortConversations,
  toggleChatSort,
  updateChatSortSettings,
} = require('../controllers/chatOrganizationController');

router.use(protect);

router.get('/settings', getChatSortSettings);
router.post('/settings', updateChatSortSettings);
router.post('/sort', sortConversations);
router.post('/custom-order', saveCustomSortOrder);
router.get('/custom-order', getCustomSortOrder);
router.delete('/custom-order', clearCustomSortOrder);
router.post('/toggle', toggleChatSort);
router.post('/reset', resetChatSortSettings);

module.exports = router;
