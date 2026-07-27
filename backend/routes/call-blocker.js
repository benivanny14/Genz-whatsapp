const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addAllowedNumber,
  blockNumber,
  checkCallBlock,
  getBlockedNumbers,
  getCallBlockHistory,
  getCallBlockerSettings,
  removeAllowedNumber,
  resetCallBlockerSettings,
  toggleCallBlocker,
  unblockNumber,
  updateCallBlockerSettings,
} = require('../controllers/callBlockerController');

router.use(protect);

router.get('/settings', getCallBlockerSettings);
router.post('/settings', updateCallBlockerSettings);
router.post('/toggle', toggleCallBlocker);
router.post('/block', blockNumber);
router.post('/unblock', unblockNumber);
router.get('/blocked', getBlockedNumbers);
router.post('/allow', addAllowedNumber);
router.delete('/allow/:phoneNumber', removeAllowedNumber);
router.post('/check', checkCallBlock);
router.get('/history', getCallBlockHistory);
router.post('/reset', resetCallBlockerSettings);

module.exports = router;
