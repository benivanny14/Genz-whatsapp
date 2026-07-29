const express = require('express');
const router = express.Router();
const mediaModsController = require('../controllers/mediaModsController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Settings routes
router.get('/settings', mediaModsController.getMediaModsSettings);
router.post('/settings', mediaModsController.updateMediaModsSettings);

// Toggle routes for individual features
router.post('/full-resolution', mediaModsController.toggleFullResolution);
router.post('/1gb-video', mediaModsController.toggleOneGBVideo);
router.post('/1000-photos', mediaModsController.toggleThousandPhotos);
router.post('/auto-download-high-res', mediaModsController.toggleAutoDownloadHighRes);
router.post('/view-once-bypass', mediaModsController.toggleViewOnceBypass);
router.post('/save-view-once', mediaModsController.toggleSaveViewOnce);
router.post('/forward-without-tag', mediaModsController.toggleForwardWithoutTag);
router.post('/forward-limit-increase', mediaModsController.toggleForwardLimitIncrease);

module.exports = router;
