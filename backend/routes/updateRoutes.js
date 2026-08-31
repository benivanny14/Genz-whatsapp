const express = require('express');
const router = express.Router();
const updateController = require('../controllers/updateController');
const { protect, isAdmin } = require('../middleware/auth');

// Public — any client can check for updates
router.get('/check', updateController.checkForUpdate);

// Admin-only — upload new version
router.post('/upload', protect, isAdmin, updateController.uploadUpdate);

// Admin-only — view update history
router.get('/stats', protect, isAdmin, updateController.getUpdateStats);

module.exports = router;
