const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  detectLanguage,
  getSupportedLanguages,
  getTranslatorSettings,
  resetTranslatorSettings,
  toggleAutoTranslate,
  translateMessage,
  updateTranslatorSettings,
} = require('../controllers/messageToolsController');

router.use(protect);

router.get('/settings', getTranslatorSettings);
router.post('/settings', updateTranslatorSettings);
router.post('/translate', translateMessage);
router.post('/detect', detectLanguage);
router.post('/auto-translate', toggleAutoTranslate);
router.get('/languages', getSupportedLanguages);
router.post('/reset', resetTranslatorSettings);

module.exports = router;
