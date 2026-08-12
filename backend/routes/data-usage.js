const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getDataUsageByConversation,
  getDataUsageSettings,
  getDataUsageStats,
  resetDataUsageSettings,
  setDataLimit,
  toggleDataSaver,
  toggleDataUsageTracking,
  updateDataUsageSettings,
} = require('../controllers/storageToolsController');

router.use(protect);

router.get('/settings', getDataUsageSettings);
router.post('/settings', updateDataUsageSettings);
router.get('/stats', getDataUsageStats);
router.get('/by-conversation', getDataUsageByConversation);
router.post('/toggle', toggleDataUsageTracking);
router.post('/limit', setDataLimit);
router.post('/data-saver', toggleDataSaver);
router.post('/reset', resetDataUsageSettings);

module.exports = router;
