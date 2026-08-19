const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  applySavedFilterPreference,
  deleteSavedFilterPreference,
  filterConversations,
  getChatFilterSettings,
  getSavedFilterPreferences,
  resetChatFilterSettings,
  saveFilterPreference,
  toggleChatFilter,
  updateChatFilterSettings,
} = require('../controllers/chatOrganizationController');

router.use(protect);

// Root GET — alias to /settings for convenience
router.get('/', getChatFilterSettings);
router.get('/settings', getChatFilterSettings);
router.post('/settings', updateChatFilterSettings);
router.post('/filter', filterConversations);
router.post('/save-preference', saveFilterPreference);
router.get('/saved-preferences', getSavedFilterPreferences);
router.delete('/saved-preferences/:id', deleteSavedFilterPreference);
router.post('/saved-preferences/:id/apply', applySavedFilterPreference);
router.post('/toggle', toggleChatFilter);
router.post('/reset', resetChatFilterSettings);

module.exports = router;
