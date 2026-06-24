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
  deleteAccount,
  updateBusinessProfile,
  addCatalogItem,
  removeCatalogItem,
  addQuickReply,
  removeQuickReply,
  updateAwayMessage,
  getBusinessAnalytics,
  checkAvailability,
  getMyOnlineHistory
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
// Refresh uses body.refreshToken only (no Authorization required)
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/picture', protect, uploadImage, uploadProfilePicture);
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.get('/blocked', protect, getBlockedUsers);
router.post('/logout', protect, logout);
router.post('/change-number', protect, changeNumber);
router.post('/delete-account', protect, deleteAccount);

// Business routes
router.put('/business-profile', protect, updateBusinessProfile);
router.post('/catalog', protect, addCatalogItem);
router.delete('/catalog/:productId', protect, removeCatalogItem);
router.post('/quick-replies', protect, addQuickReply);
router.delete('/quick-replies/:id', protect, removeQuickReply);
router.put('/away-message', protect, updateAwayMessage);
router.get('/business-analytics', protect, getBusinessAnalytics);

router.post('/check-availability', checkAvailability);
router.get('/users/me/online-history', protect, getMyOnlineHistory);
router.get('/users/:id/online-history', protect, getUserOnlineHistory);

module.exports = router;
