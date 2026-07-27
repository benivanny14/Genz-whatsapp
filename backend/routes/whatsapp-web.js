const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  connectDevice,
  disconnectDevice,
  generateQRCode,
  getConnectedDevices,
  getConnectionStatus,
  getWhatsAppWebSettings,
  logoutAllDevices,
  resetWhatsAppWebSettings,
  toggleWhatsAppWeb,
  updateSyncSettings,
  updateWhatsAppWebSettings,
} = require('../controllers/whatsappWebController');

router.use(protect);

router.get('/settings', getWhatsAppWebSettings);
router.post('/settings', updateWhatsAppWebSettings);
router.post('/qr-code', generateQRCode);
router.get('/status', getConnectionStatus);
router.post('/connect', connectDevice);
router.delete('/disconnect/:deviceId', disconnectDevice);
router.get('/devices', getConnectedDevices);
router.post('/logout-all', logoutAllDevices);
router.post('/toggle', toggleWhatsAppWeb);
router.post('/sync-settings', updateSyncSettings);
router.post('/reset', resetWhatsAppWebSettings);

module.exports = router;
