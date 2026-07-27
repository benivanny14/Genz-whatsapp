const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  cancelScheduledBulkMessage,
  getBulkMessageDeliveryStatus,
  getBulkMessageHistory,
  getBulkSenderSettings,
  getScheduledBulkMessages,
  resetBulkSenderSettings,
  sendBulkMessage,
  toggleBulkSending,
  updateBulkSenderSettings,
} = require('../controllers/bulkSenderController');

router.use(protect);

router.get('/settings', getBulkSenderSettings);
router.post('/settings', updateBulkSenderSettings);
router.post('/send', sendBulkMessage);
router.get('/scheduled', getScheduledBulkMessages);
router.delete('/scheduled/:id', cancelScheduledBulkMessage);
router.get('/history', getBulkMessageHistory);
router.get('/delivery/:batchId', getBulkMessageDeliveryStatus);
router.post('/toggle', toggleBulkSending);
router.post('/reset', resetBulkSenderSettings);

module.exports = router;
