const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearViewedStatuses,
  commentOnStatus,
  getStatusComments,
  getStatusReactions,
  getStatusReelModeSettings,
  getStatusesInReelMode,
  markStatusAsViewed,
  reactToStatus,
  resetStatusReelModeSettings,
  toggleStatusReelMode,
  updateStatusReelModeSettings,
} = require('../controllers/statusReelModeController');

router.use(protect);

router.get('/settings', getStatusReelModeSettings);
router.post('/settings', updateStatusReelModeSettings);
router.get('/statuses', getStatusesInReelMode);
router.post('/status/:statusId/viewed', markStatusAsViewed);
router.post('/status/:statusId/react', reactToStatus);
router.get('/status/:statusId/reactions', getStatusReactions);
router.post('/status/:statusId/comment', commentOnStatus);
router.get('/status/:statusId/comments', getStatusComments);
router.delete('/viewed', clearViewedStatuses);
router.post('/toggle', toggleStatusReelMode);
router.post('/reset', resetStatusReelModeSettings);

module.exports = router;
