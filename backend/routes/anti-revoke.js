const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAntiRevokeSettings,
  updateAntiRevokeSettings,
  cacheDeletedMessage,
  getCachedDeletedMessages,
  clearCachedMessages,
  spyViewDeletedMessages,
  toggleAntiRevoke,
  resetAntiRevokeSettings
} = require('../controllers/antiRevokeController');

router.use(protect);

router.get('/settings', getAntiRevokeSettings);
router.post('/settings', updateAntiRevokeSettings);
router.post('/cache', cacheDeletedMessage);
router.get('/cached', getCachedDeletedMessages);
router.get('/spy-view', spyViewDeletedMessages);
router.delete('/cached', clearCachedMessages);
router.post('/toggle', toggleAntiRevoke);
router.post('/reset', resetAntiRevokeSettings);

module.exports = router;
