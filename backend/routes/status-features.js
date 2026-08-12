const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addToCloseFriends,
  createStatusHighlight,
  getStatusFeaturesSettings,
  getStatusViewers,
  removeFromCloseFriends,
  resetStatusFeaturesSettings,
  toggleStatusCloseFriends,
  toggleStatusHighlights,
  updateStatusDuration,
  updateStatusFeaturesSettings,
  updateStatusPrivacy,
} = require('../controllers/statusToolsController');

router.use(protect);

router.get('/settings', getStatusFeaturesSettings);
router.post('/settings', updateStatusFeaturesSettings);
router.post('/privacy', updateStatusPrivacy);
router.post('/highlights', toggleStatusHighlights);
router.post('/highlight/create', createStatusHighlight);
router.post('/close-friends', toggleStatusCloseFriends);
router.post('/close-friends/add', addToCloseFriends);
router.post('/close-friends/remove', removeFromCloseFriends);
router.get('/viewers/:statusId', getStatusViewers);
router.post('/duration', updateStatusDuration);
router.post('/reset', resetStatusFeaturesSettings);

module.exports = router;
