const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  deleteSavedGIF,
  getGIFPlayerSettings,
  getSavedGIFs,
  resetGIFPlayerSettings,
  saveGIF,
  toggleAutoPlayGIFs,
  toggleGIFPlayer,
  updateGIFPlaybackSpeed,
  updateGIFPlayerSettings,
  updateGIFQuality,
} = require('../controllers/gifPlayerController');

router.use(protect);

router.get('/settings', getGIFPlayerSettings);
router.post('/settings', updateGIFPlayerSettings);
router.post('/toggle', toggleGIFPlayer);
router.post('/auto-play', toggleAutoPlayGIFs);
router.post('/quality', updateGIFQuality);
router.post('/playback-speed', updateGIFPlaybackSpeed);
router.get('/saved', getSavedGIFs);
router.post('/save', saveGIF);
router.delete('/saved/:id', deleteSavedGIF);
router.post('/reset', resetGIFPlayerSettings);

module.exports = router;
