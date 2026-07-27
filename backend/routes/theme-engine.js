const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAvailableOptions,
  getThemeEngineSettings,
  resetThemeEngineSettings,
  toggleThemeEngine,
  updateCustomColors,
  updateFontSettings,
  updateThemeEngineSettings,
  updateThemeMode,
  updateUICustomization,
} = require('../controllers/themeEngineController');

router.use(protect);

router.get('/settings', getThemeEngineSettings);
router.post('/settings', updateThemeEngineSettings);
router.post('/font', updateFontSettings);
router.post('/mode', updateThemeMode);
router.post('/colors', updateCustomColors);
router.post('/ui-customization', updateUICustomization);
router.get('/options', getAvailableOptions);
router.post('/toggle', toggleThemeEngine);
router.post('/reset', resetThemeEngineSettings);

module.exports = router;
