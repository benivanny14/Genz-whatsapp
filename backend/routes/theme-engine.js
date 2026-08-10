const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
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
router.post('/settings', updateThemeEngineSettings);
router.post('/font', updateFontSettings);
router.post('/mode', updateThemeMode);
router.post('/colors', updateCustomColors);
router.post('/ui-customization', updateUICustomization);
router.get('/options', getAvailableOptions);
router.post('/toggle', toggleThemeEngine);
router.post('/legacy-2014', toggleLegacy2014);
router.post('/reset', resetThemeEngineSettings);

module.exports = router;
