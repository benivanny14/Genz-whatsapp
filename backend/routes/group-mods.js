const express = require('express');
const router = express.Router();
const groupModsController = require('../controllers/groupToolsController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', groupModsController.getGroupModsSettings);
router.post('/settings', groupModsController.updateGroupModsSettings);

// Toggle routes for individual features
router.post('/admin-tools', groupModsController.toggleAdminTools);
router.post('/member-limit', groupModsController.toggleMemberLimit);
router.post('/description-length', groupModsController.toggleDescriptionLength);
router.post('/link-customization', groupModsController.toggleLinkCustomization);
router.post('/join-approval', groupModsController.toggleJoinApproval);
router.post('/announcements', groupModsController.toggleAnnouncements);
router.post('/polls', groupModsController.togglePolls);
router.post('/events', groupModsController.toggleEvents);

module.exports = router;
