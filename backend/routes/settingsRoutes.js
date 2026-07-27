const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  resetSettings
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

// All settings routes require authentication
router.use(protect);

// Get user settings
router.get('/', getSettings);

// Update user settings
router.put('/', updateSettings);

// Reset user settings to defaults
router.post('/reset', resetSettings);

module.exports = router;
