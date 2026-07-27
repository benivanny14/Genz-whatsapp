const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  clearCache,
  clearOldCache,
  getCacheCleanerSettings,
  getCacheSize,
  resetCacheCleanerSettings,
  setMaxCacheSize,
  toggleCacheCleaner,
  updateCacheCleanerSettings,
} = require('../controllers/cacheCleanerController');

router.use(protect);

router.get('/settings', getCacheCleanerSettings);
router.post('/settings', updateCacheCleanerSettings);
router.get('/size', getCacheSize);
router.post('/clear', clearCache);
router.post('/clear-old', clearOldCache);
router.post('/toggle', toggleCacheCleaner);
router.post('/max-size', setMaxCacheSize);
router.post('/reset', resetCacheCleanerSettings);

module.exports = router;
