const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  compressMedia,
  getCompressionStats,
  getCompressorSettings,
  resetCompressorSettings,
  updateCompressorSettings,
} = require('../controllers/mediaToolsController');

router.use(protect);

router.get('/settings', getCompressorSettings);
router.post('/settings', updateCompressorSettings);
router.post('/compress', compressMedia);
router.get('/stats', getCompressionStats);
router.post('/reset', resetCompressorSettings);

module.exports = router;
