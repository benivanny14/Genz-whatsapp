const express = require('express');
const router = express.Router();
const {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  disableTwoFactor,
  verifyTwoFactorLogin,
  getSecuritySettings,
  updateSecuritySettings,
  getTwoFactorStatus,
  sendEmailVerification,
  verifyEmail,
  resendEmailVerification,
  getEmailVerificationStatus,
  sendPasswordReset,
  resetPassword
} = require('../controllers/securityController');
const { protect } = require('../middleware/auth');

// 2FA Routes
router.post('/2fa/generate', protect, generateTwoFactorSecret);
router.post('/2fa/setup', protect, generateTwoFactorSecret);
router.post('/2fa/verify', protect, verifyTwoFactorToken);
router.post('/2fa/disable', protect, disableTwoFactor);
router.post('/2fa/login-verify', verifyTwoFactorLogin);
router.get('/2fa/status', protect, getTwoFactorStatus);

// Email Verification Routes
router.post('/email/send-verification', protect, sendEmailVerification);
router.post('/email/verify', verifyEmail);
router.post('/email/resend-verification', protect, resendEmailVerification);
router.get('/email/status', protect, getEmailVerificationStatus);

// Password Reset Routes
router.post('/password/send-reset', sendPasswordReset);
router.post('/password/reset', resetPassword);

// Account Security Settings
router.get('/settings', protect, getSecuritySettings);
router.put('/settings', protect, updateSecuritySettings);

module.exports = router;
