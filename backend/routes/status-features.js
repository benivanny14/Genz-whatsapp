const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addToCloseFriends,
  createStatusHighlight,
  generateAIStatusBackground,
  generateAIStatusCaption,
  getStatusFeaturesSettings,
  getStatusViewers,
  removeFromCloseFriends,
  resetStatusFeaturesSettings,
  toggleStatusAIFeatures,
  toggleStatusCloseFriends,
  toggleStatusHighlights,
  updateStatusFeaturesSettings,
  updateStatusPrivacy,
} = require('../controllers/statusFeaturesController');

router.use(protect);

router.get('/settings', getStatusFeaturesSettings);
router.post('/settings', updateStatusFeaturesSettings);
router.post('/privacy', updateStatusPrivacy);
router.post('/highlights', toggleStatusHighlights);
router.post('/highlight/create', createStatusHighlight);
router.post('/ai-features', toggleStatusAIFeatures);
router.post('/ai-caption', generateAIStatusCaption);
router.post('/ai-background', generateAIStatusBackground);
router.post('/close-friends', toggleStatusCloseFriends);
router.post('/close-friends/add', addToCloseFriends);
router.post('/close-friends/remove', removeFromCloseFriends);
router.get('/viewers/:statusId', getStatusViewers);
router.post('/reset', resetStatusFeaturesSettings);

module.exports = router;
