const express = require('express');
const router = express.Router();
const {
  generateQRCode,
  pairDevice,
  getDevices,
  unlinkDevice,
  updateDeviceActive,
  logoutAllDevices,
  updateDeviceCapabilities,
  renameDevice
} = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');
const { pairingLimiter } = require('../middleware/rateLimiters');

// IMPORTANT: pairing a brand-new device happens BEFORE that device has any
// session/token — it only has the pairing token embedded in the QR code.
// Requiring auth here was the cause of "failed to pair device": the new
// device could never reach this endpoint authenticated, since it hadn't
// logged in yet. The token itself (short-lived, single-use) is the auth.
// Rate-limited because the endpoint is credential-free — it must not be
// brute-forceable.
router.post('/pair', pairingLimiter, pairDevice);

router.use(protect);

router.post('/generate-qr', generateQRCode);
router.get('/', getDevices);
router.delete('/:id', unlinkDevice);
router.put('/:id', renameDevice);
router.put('/:id/active', updateDeviceActive);
router.post('/logout-all', logoutAllDevices);
router.put('/:id/capabilities', updateDeviceCapabilities);

module.exports = router;
