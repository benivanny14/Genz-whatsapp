const express = require('express');
const router = express.Router();
const customizationModsController = require('../controllers/userSettingsController');
const { protect } = require('../middleware/auth');
const { checkPremiumAccess } = require('../middleware/premiumAccess');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', customizationModsController.getCustomizationModsSettings);
router.post('/settings', customizationModsController.updateCustomizationModsSettings);

// Toggle routes for individual features — premium customizations require subscription
router.post('/custom-ticks', checkPremiumAccess, customizationModsController.toggleCustomTicks);
router.post('/custom-fonts', checkPremiumAccess, customizationModsController.toggleCustomFonts);
router.post('/custom-bubble-colors', checkPremiumAccess, customizationModsController.toggleCustomBubbleColors);
router.post('/custom-header', checkPremiumAccess, customizationModsController.toggleCustomHeader);
router.post('/custom-navigation', checkPremiumAccess, customizationModsController.toggleCustomNavigation);
router.post('/custom-icons', checkPremiumAccess, customizationModsController.toggleCustomIcons);
router.post('/custom-emojis', checkPremiumAccess, customizationModsController.toggleCustomEmojis);
router.post('/themes-store', checkPremiumAccess, customizationModsController.toggleThemesStore);

module.exports = router;
