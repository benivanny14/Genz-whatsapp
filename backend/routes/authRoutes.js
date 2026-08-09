const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  getSettings,
  updateSettings,
  logout,
  refreshToken,
  uploadProfilePicture,
  getBlockedUsers,
  changeNumber,
  changePassword,
  deleteAccount,
  updateBusinessProfile,
  addCatalogItem,
  removeCatalogItem,
  addQuickReply,
  removeQuickReply,
  updateAwayMessage,
  getBusinessAnalytics,
  checkAvailability,
  getMyOnlineHistory,
  getUserOnlineHistory,
  checkPasskeyAvailable,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyLoginOptions,
  passkeyLoginVerify,
   getPasskeys,
  deletePasskey,
  forgotPassword,
  resetPassword,
  verifyPhoneOTP,
  resendPhoneOTP
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { validateFileContent } = require('../middleware/fileValidation');
const { privacyMiddleware } = require('../middleware/privacy');
const {
  registerValidators,
  loginValidators,
  checkAvailabilityValidators
} = require('../middleware/validators');
const { authSensitiveLimiter, discoveryLimiter } = require('../middleware/rateLimiters');
const {
  sendOtp,
  verifyOtp,
  getWhatsAppStatus,
  getWhatsAppQr,
  getWhatsAppQrDisplay,
  resetWhatsApp
} = require('../controllers/whatsappOtpController');

// Sensitive credential routes get their own strict limiter so a burst of
// authenticated calls (background polling) can never exhaust the budget for
// login/registration, and vice-versa.
router.post('/register', authSensitiveLimiter, registerValidators, register);
router.post('/login', authSensitiveLimiter, loginValidators, login);
// Refresh uses body.refreshToken only (no Authorization required)
router.post('/refresh', authSensitiveLimiter, refreshToken);
router.get('/me', protect, privacyMiddleware, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/picture', protect, uploadImage, validateFileContent, uploadProfilePicture);
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.get('/blocked', protect, privacyMiddleware, getBlockedUsers);
// Logout must NOT require auth: the frontend calls it fire-and-forget during
// session clear even when the user is already logged out (no access token),
// and a 401 there only adds console noise. The controller guards req.user and
// always clears the httpOnly cookies, so it is safe to call unauthenticated.
router.post('/logout', logout);
router.post('/change-number', protect, changeNumber);
router.post('/change-password', protect, changePassword);
router.post('/delete-account', protect, deleteAccount);

// Business routes
router.put('/business-profile', protect, updateBusinessProfile);
router.post('/catalog', protect, addCatalogItem);
router.delete('/catalog/:productId', protect, removeCatalogItem);
router.post('/quick-replies', protect, addQuickReply);
router.delete('/quick-replies/:id', protect, removeQuickReply);
router.put('/away-message', protect, updateAwayMessage);
router.get('/business-analytics', protect, getBusinessAnalytics);

router.post('/check-availability', discoveryLimiter, checkAvailabilityValidators, checkAvailability);
router.get('/users/me/online-history', protect, getMyOnlineHistory);
router.get('/users/:id/online-history', protect, getUserOnlineHistory);

// Passkey (WebAuthn) routes
router.post('/passkey/check', discoveryLimiter, checkPasskeyAvailable);
router.post('/passkey/register/options', protect, passkeyRegisterOptions);
router.post('/passkey/register/verify', protect, passkeyRegisterVerify);
router.post('/passkey/login/options', passkeyLoginOptions);
router.post('/passkey/login/verify', passkeyLoginVerify);
router.get('/passkey/list', protect, getPasskeys);
router.delete('/passkey/:id', protect, deletePasskey);

// Password reset (forgot password) — rate-limited, no auth required.
router.post('/forgot-password', authSensitiveLimiter, forgotPassword);
router.post('/reset-password', authSensitiveLimiter, resetPassword);

// Phone verification — rate-limited, session required.
router.post('/verify-phone-otp', protect, authSensitiveLimiter, verifyPhoneOTP);
router.post('/resend-phone-otp', protect, authSensitiveLimiter, resendPhoneOTP);

// WhatsApp OTP delivery (whatsapp-web.js) — public, rate-limited.
// Status endpoint is public so the frontend can show "scan QR first" hints.
router.post('/send-otp', authSensitiveLimiter, sendOtp);
router.post('/verify-otp', authSensitiveLimiter, verifyOtp);
router.get('/whatsapp/status', getWhatsAppStatus);
router.get('/whatsapp/qr', getWhatsAppQr);
router.get('/whatsapp/qr/display', getWhatsAppQrDisplay);
router.post('/whatsapp/reset', resetWhatsApp);

module.exports = router;
