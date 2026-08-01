const express = require('express');
const router = express.Router();
const securityModsController = require('../controllers/securityModsController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', securityModsController.getSecurityModsSettings);
router.post('/settings', securityModsController.updateSecurityModsSettings);

// Toggle routes for individual features
router.post('/anti-ban', securityModsController.toggleAntiBan);
router.post('/proxy', securityModsController.toggleProxy);
router.post('/ip-spoofing', securityModsController.toggleIPSpoofing);
router.post('/device-spoofing', securityModsController.toggleDeviceSpoofing);
router.post('/app-lock-pattern', securityModsController.toggleAppLockPattern);
router.post('/app-lock-pin', securityModsController.toggleAppLockPIN);
router.post('/app-lock-fingerprint', securityModsController.toggleAppLockFingerprint);
router.post('/app-lock-face', securityModsController.toggleAppLockFace);
router.post('/anti-screenshot', securityModsController.toggleAntiScreenshot);
router.post('/screen-recording-detection', securityModsController.toggleScreenRecordingDetection);
router.post('/vpn', securityModsController.toggleVPN);
router.get('/vpn', securityModsController.getVPNStatus);

module.exports = router;
