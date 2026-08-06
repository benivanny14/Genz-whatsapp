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
  deletePasskey
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { privacyMiddleware } = require('../middleware/privacy');
const {
  registerValidators,
  loginValidators,
  checkAvailabilityValidators
} = require('../middleware/validators');
const { authSensitiveLimiter } = require('../middleware/rateLimiters');

// Sensitive credential routes get their own strict limiter so a burst of
// authenticated calls (background polling) can never exhaust the budget for
// login/registration, and vice-versa.
router.post('/register', authSensitiveLimiter, registerValidators, register);
router.post('/login', authSensitiveLimiter, loginValidators, login);
// Refresh uses body.refreshToken only (no Authorization required)
router.post('/refresh', authSensitiveLimiter, refreshToken);
router.get('/me', protect, privacyMiddleware, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/picture', protect, uploadImage, uploadProfilePicture);
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.get('/blocked', protect, privacyMiddleware, getBlockedUsers);
router.post('/logout', protect, logout);
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

router.post('/check-availability', checkAvailabilityValidators, checkAvailability);
router.get('/users/me/online-history', protect, getMyOnlineHistory);
router.get('/users/:id/online-history', protect, getUserOnlineHistory);

// Passkey (WebAuthn) routes
router.post('/passkey/check', checkPasskeyAvailable);
router.post('/passkey/register/options', protect, passkeyRegisterOptions);
router.post('/passkey/register/verify', protect, passkeyRegisterVerify);
router.post('/passkey/login/options', passkeyLoginOptions);
router.post('/passkey/login/verify', passkeyLoginVerify);
router.get('/passkey/list', protect, getPasskeys);
router.delete('/passkey/:id', protect, deletePasskey);

module.exports = router;
