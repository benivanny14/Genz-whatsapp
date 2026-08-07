const express = require('express');
const router = express.Router();
const {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  disableTwoFactor,
  verifyTwoFactorLogin,
  getSecuritySettings,
  updateSecuritySettings,
  getTwoFactorStatus
} = require('../controllers/securityController');
const { protect } = require('../middleware/auth');
const { authSensitiveLimiter } = require('../middleware/rateLimiters');

// 2FA Routes
router.post('/2fa/generate', protect, generateTwoFactorSecret);
router.post('/2fa/setup', protect, generateTwoFactorSecret);
router.post('/2fa/verify', protect, verifyTwoFactorToken);
router.post('/2fa/disable', protect, disableTwoFactor);
// Login-verify is credential-free (only a TOTP code + short-lived state).
// Rate-limit it so a leaked code cannot be brute-forced.
router.post('/2fa/login-verify', authSensitiveLimiter, verifyTwoFactorLogin);
router.get('/2fa/status', protect, getTwoFactorStatus);

// Account Security Settings
router.get('/settings', protect, getSecuritySettings);
router.put('/settings', protect, updateSecuritySettings);

module.exports = router;
