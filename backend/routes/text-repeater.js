const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTextRepeaterSettings,
  repeatText,
  repeatTextDelayed,
  resetTextRepeaterSettings,
  toggleTextRepeater,
  updateMaxRepeatCount,
  updateTextRepeaterSettings,
} = require('../controllers/automationToolsController');

router.use(protect);

router.get('/settings', getTextRepeaterSettings);
router.post('/settings', updateTextRepeaterSettings);
router.post('/repeat', repeatText);
router.post('/repeat-delayed', repeatTextDelayed);
router.post('/toggle', toggleTextRepeater);
router.post('/max-count', updateMaxRepeatCount);
router.post('/reset', resetTextRepeaterSettings);

module.exports = router;
