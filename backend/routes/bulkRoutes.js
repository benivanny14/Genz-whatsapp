const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const bulkController = require('../controllers/bulkMessageController');

router.use(protect);

// Mass message sender
router.post('/send', bulkController.sendBulkMessage);
router.post('/send-to-all-contacts', bulkController.sendToAllContacts);

module.exports = router;
