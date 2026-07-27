const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addQuickReply,
  deleteQuickReply,
  disableBusinessAccount,
  enableBusinessAccount,
  getBusinessAccountSettings,
  getBusinessAnalytics,
  resetBusinessAccountSettings,
  toggleAwayMode,
  updateAutoReply,
  updateBusinessAccountSettings,
  updateBusinessHours,
} = require('../controllers/businessAccountController');

router.use(protect);

router.get('/settings', getBusinessAccountSettings);
router.post('/settings', updateBusinessAccountSettings);
router.post('/enable', enableBusinessAccount);
router.post('/disable', disableBusinessAccount);
router.post('/hours', updateBusinessHours);
router.post('/auto-reply', updateAutoReply);
router.post('/quick-reply', addQuickReply);
router.delete('/quick-reply/:id', deleteQuickReply);
router.post('/away-mode', toggleAwayMode);
router.get('/analytics', getBusinessAnalytics);
router.post('/reset', resetBusinessAccountSettings);

module.exports = router;
