const express = require('express');
const router = express.Router();
const customizationModsController = require('../controllers/userSettingsController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', customizationModsController.getCustomizationModsSettings);
router.post('/settings', customizationModsController.updateCustomizationModsSettings);

// Toggle routes for individual features
router.post('/custom-ticks', customizationModsController.toggleCustomTicks);
router.post('/custom-fonts', customizationModsController.toggleCustomFonts);
router.post('/custom-bubble-colors', customizationModsController.toggleCustomBubbleColors);
router.post('/custom-header', customizationModsController.toggleCustomHeader);
router.post('/custom-navigation', customizationModsController.toggleCustomNavigation);
router.post('/custom-icons', customizationModsController.toggleCustomIcons);
router.post('/custom-emojis', customizationModsController.toggleCustomEmojis);
router.post('/themes-store', customizationModsController.toggleThemesStore);

module.exports = router;
