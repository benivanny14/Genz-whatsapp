const express = require('express');
const router = express.Router();
const automationModsController = require('../controllers/automationModsController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', automationModsController.getAutomationModsSettings);
router.post('/settings', automationModsController.updateAutomationModsSettings);

// Toggle routes for individual features
router.post('/auto-reply', automationModsController.toggleAutoReply);
router.post('/auto-reply-ai', automationModsController.toggleAutoReplyAI);
router.post('/auto-delete', automationModsController.toggleAutoDelete);
router.post('/auto-delete-days', automationModsController.updateAutoDeleteDays);
router.post('/auto-archive', automationModsController.toggleAutoArchive);
router.post('/auto-archive-days', automationModsController.updateAutoArchiveDays);
router.post('/auto-mute-groups', automationModsController.toggleAutoMuteGroups);
router.post('/welcome-message', automationModsController.toggleWelcomeMessage);
router.post('/welcome-message-text', automationModsController.updateWelcomeMessageText);
router.post('/goodbye-message', automationModsController.toggleGoodbyeMessage);
router.post('/goodbye-message-text', automationModsController.updateGoodbyeMessageText);

module.exports = router;
