const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  checkRateLimit,
  clearWarning,
  getAntiBanSettings,
  getSecurityStatus,
  recordSuspiciousActivity,
  resetAntiBanSettings,
  toggleAntiBan,
  toggleDeviceSpoof,
  toggleIPMask,
  toggleSecureMode,
  updateAntiBanSettings,
  updateRateLimiting,
} = require('../controllers/messageProtectionController');

router.use(protect);

router.get('/settings', getAntiBanSettings);
router.post('/settings', updateAntiBanSettings);
router.post('/toggle', toggleAntiBan);
router.post('/device-spoof', toggleDeviceSpoof);
router.post('/ip-mask', toggleIPMask);
router.post('/secure-mode', toggleSecureMode);
router.post('/rate-limiting', updateRateLimiting);
router.post('/check-rate-limit', checkRateLimit);
router.post('/suspicious-activity', recordSuspiciousActivity);
router.get('/security-status', getSecurityStatus);
router.post('/clear-warning', clearWarning);
router.post('/reset', resetAntiBanSettings);

module.exports = router;
