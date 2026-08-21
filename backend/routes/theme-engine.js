const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPremiumAccess } = require('../middleware/premiumAccess');
const {
  getAvailableOptions,
  getThemeEngineSettings,
  resetThemeEngineSettings,
  toggleLegacy2014,
  toggleThemeEngine,
  updateCustomColors,
  updateFontSettings,
  updateThemeEngineSettings,
  updateThemeMode,
  updateUICustomization,
} = require('../controllers/userSettingsController');

router.use(protect);

router.get('/settings', getThemeEngineSettings);
router.post('/settings', checkPremiumAccess, updateThemeEngineSettings);
router.post('/font', checkPremiumAccess, updateFontSettings);
router.post('/mode', updateThemeMode);
router.post('/colors', checkPremiumAccess, updateCustomColors);
router.post('/ui-customization', checkPremiumAccess, updateUICustomization);
router.get('/options', getAvailableOptions);
router.post('/toggle', toggleThemeEngine);
router.post('/legacy-2014', toggleLegacy2014);
router.post('/reset', resetThemeEngineSettings);

module.exports = router;
