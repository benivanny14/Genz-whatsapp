const express = require('express');
const router = express.Router();
const mediaModsController = require('../controllers/mediaToolsController');
const { protect } = require('../middleware/auth');
const { checkPremiumAccess, stripPremiumSettingsFields } = require('../middleware/premiumAccess');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', mediaModsController.getMediaModsSettings);
router.post('/settings', stripPremiumSettingsFields([
	'fullResolutionImages', 'oneGBVideoUpload', 'thousandPhotosBatch',
	'autoDownloadHighRes', 'viewOnceBypass', 'saveViewOnceMedia'
]), mediaModsController.updateMediaModsSettings);

// Toggle routes for individual features
router.post('/full-resolution', checkPremiumAccess, mediaModsController.toggleFullResolution);
router.post('/1gb-video', checkPremiumAccess, mediaModsController.toggleOneGBVideo);
router.post('/1000-photos', checkPremiumAccess, mediaModsController.toggleThousandPhotos);
router.post('/auto-download-high-res', checkPremiumAccess, mediaModsController.toggleAutoDownloadHighRes);
router.post('/view-once-bypass', checkPremiumAccess, mediaModsController.toggleViewOnceBypass);
router.post('/save-view-once', checkPremiumAccess, mediaModsController.toggleSaveViewOnce);
router.post('/forward-without-tag', mediaModsController.toggleForwardWithoutTag);
router.post('/forward-limit-increase', mediaModsController.toggleForwardLimitIncrease);

module.exports = router;
