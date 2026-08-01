const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacyController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', privacyController.getPrivacyModsSettings);
router.post('/settings', privacyController.updatePrivacyModsSettings);

// Toggle routes for individual features
router.post('/freeze-last-seen', privacyController.toggleFreezeLastSeen);
router.post('/ghost-mode', privacyController.toggleGhostMode);
router.post('/hide-online', privacyController.toggleHideOnline);
router.post('/anti-view-once', privacyController.toggleAntiViewOnce);
router.post('/disable-forwarded-tag', privacyController.toggleDisableForwardedTag);
router.post('/hide-status-view', privacyController.toggleHideStatusView);
router.post('/hide-read-receipts', privacyController.toggleHideReadReceipts);
router.post('/who-viewed-profile', privacyController.toggleWhoViewedProfile);
router.post('/contact-online-notifier', privacyController.toggleContactOnlineNotifier);
router.post('/auto-download-status', privacyController.toggleAutoDownloadStatus);
router.post('/language-per-chat', privacyController.toggleLanguagePerChat);
router.post('/custom-tick-per-contact', privacyController.toggleCustomTickPerContact);
router.post('/custom-emoji-style', privacyController.toggleCustomEmojiStyle);
router.post('/block-alerts', privacyController.toggleBlockAlerts);
router.get('/block-alerts', privacyController.getBlockAlerts);
router.delete('/block-alerts', privacyController.clearBlockAlerts);

module.exports = router;
