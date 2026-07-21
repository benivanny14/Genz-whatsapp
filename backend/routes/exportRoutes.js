const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

// All export routes require authentication
router.use(protect);

// Export chat in different formats
router.get('/chat/:id/txt', exportController.exportAsTxt);
router.get('/chat/:id/html', exportController.exportAsHtml);
router.get('/chat/:id/json', exportController.exportAsJson);

module.exports = router;
