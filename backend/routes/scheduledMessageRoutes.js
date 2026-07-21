const express = require('express');
const router = express.Router();
const {
  createScheduledMessage,
  getScheduledMessages,
  getScheduledMessage,
  cancelScheduledMessage,
  deleteScheduledMessage,
  processScheduledMessages
} = require('../controllers/scheduledMessageController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createScheduledMessage);
router.get('/', protect, getScheduledMessages);
router.get('/:id', protect, getScheduledMessage);
router.delete('/:id', protect, cancelScheduledMessage);
router.delete('/:id/permanent', protect, deleteScheduledMessage);
router.post('/process', protect, processScheduledMessages);

module.exports = router;
