const express = require('express');
const router = express.Router();
const {
  generateQRCode,
  pairDevice,
  getDevices,
  unlinkDevice,
  updateDeviceActive,
  logoutAllDevices,
  updateDeviceCapabilities
} = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/generate-qr', generateQRCode);
router.post('/pair', pairDevice);
router.get('/', getDevices);
router.delete('/:id', unlinkDevice);
router.put('/:id/active', updateDeviceActive);
router.post('/logout-all', logoutAllDevices);
router.put('/:id/capabilities', updateDeviceCapabilities);

module.exports = router;
