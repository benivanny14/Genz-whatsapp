const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCallFeaturesSettings,
  resetCallFeaturesSettings,
  toggleCallBlocker,
  toggleCallHistory,
  toggleCallHold,
  toggleCallLink,
  toggleCallMute,
  toggleCallRecording,
  toggleCallScreenShare,
  toggleCallTransfer,
  toggleCallVideoToggle,
  toggleCallWaiting,
  toggleDNDModeForCalls,
  toggleDisableVideoCalls,
  toggleDisableVoiceCalls,
  toggleHideCallButton,
  updateCallFeaturesSettings,
  updateCallTimeout,
  updateMaxCallDuration,
} = require('../controllers/callFeaturesController');

router.use(protect);

router.get('/settings', getCallFeaturesSettings);
router.post('/settings', updateCallFeaturesSettings);
router.post('/recording', toggleCallRecording);
router.post('/waiting', toggleCallWaiting);
router.post('/hold', toggleCallHold);
router.post('/transfer', toggleCallTransfer);
router.post('/screen-share', toggleCallScreenShare);
router.post('/video-toggle', toggleCallVideoToggle);
router.post('/mute', toggleCallMute);
router.post('/blocker', toggleCallBlocker);
router.post('/history', toggleCallHistory);
router.post('/link', toggleCallLink);
router.post('/hide-button', toggleHideCallButton);
router.post('/dnd', toggleDNDModeForCalls);
router.post('/disable-voice', toggleDisableVoiceCalls);
router.post('/disable-video', toggleDisableVideoCalls);
router.post('/timeout', updateCallTimeout);
router.post('/max-duration', updateMaxCallDuration);
router.post('/reset', resetCallFeaturesSettings);

module.exports = router;
