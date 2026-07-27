const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
  bulkSendingEnabled: true,
  maxRecipientsPerBatch: 100,
  delayBetweenMessages: 1000, // milliseconds
  allowGroups: true,
  allowBroadcasts: true,
  trackDelivery: true,
  autoRetryFailed: true,
  maxRetries: 3,
  requireConfirmation: true,
  scheduleBulkMessages: true
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings
});

// @desc    Get bulk sender settings
// @route   GET /api/bulk-sender/settings
// @access  Private
exports.getBulkSenderSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.bulkSenderSettings?.toObject?.() || user.bulkSenderSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get bulk sender settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update bulk sender settings
// @route   POST /api/bulk-sender/settings
// @access  Private
exports.updateBulkSenderSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.bulkSenderSettings?.toObject?.() || user.bulkSenderSettings || {};
    
    user.bulkSenderSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('bulkSenderSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.bulkSenderSettings });
  } catch (error) {
    console.error('Update bulk sender settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send bulk message
// @route   POST /api/bulk-sender/send
// @access  Private
exports.sendBulkMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { recipients, content, messageType, mediaUrl, delay, scheduleTime } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients are required' });
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Content or media URL is required' });
    }

    const settings = mergeSettings(user.bulkSenderSettings?.toObject?.() || user.bulkSenderSettings);
    
    if (!settings.bulkSendingEnabled) {
      return res.status(403).json({ success: false, message: 'Bulk sending is disabled' });
    }

    if (recipients.length > settings.maxRecipientsPerBatch) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxRecipientsPerBatch} recipients allowed per batch` 
      });
    }

    if (scheduleTime) {
      // Schedule the bulk message
      const scheduledMessage = {
        _id: new (require('mongoose').Types.ObjectId)(),
        recipients,
        content,
        messageType,
        mediaUrl,
        scheduledFor: new Date(scheduleTime),
        createdBy: user._id,
        createdAt: new Date(),
        status: 'scheduled'
      };

      if (!user.scheduledBulkMessages) user.scheduledBulkMessages = [];
      user.scheduledBulkMessages.push(scheduledMessage);
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Bulk message scheduled successfully',
        scheduledMessageId: scheduledMessage._id,
        scheduledFor: scheduledMessage.scheduledFor
      });
    }

    // Send immediately
    const results = [];
    const errors = [];
    const messageDelay = delay || settings.delayBetweenMessages;

    for (let i = 0; i < recipients.length; i++) {
      const recipientId = recipients[i];
      
      try {
        const conversation = await Conversation.findOne({
          participants: { $all: [user._id, recipientId] },
          isGroup: false
        });

        if (!conversation) {
          errors.push({ recipientId, error: 'Conversation not found' });
          continue;
        }

        const message = await Message.create({
          conversationId: conversation._id,
          sender: user._id,
          content: content || '',
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || null,
          bulkMessage: true,
          bulkBatchId: new (require('mongoose').Types.ObjectId)()
        });

        results.push({ recipientId, messageId: message._id });

        // Add delay between messages
        if (i < recipients.length - 1 && messageDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, messageDelay));
        }
      } catch (err) {
        errors.push({ recipientId, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Send bulk message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get scheduled bulk messages
// @route   GET /api/bulk-sender/scheduled
// @access  Private
exports.getScheduledBulkMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const scheduled = user.scheduledBulkMessages || [];
    res.status(200).json({ success: true, scheduled });
  } catch (error) {
    console.error('Get scheduled bulk messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel scheduled bulk message
// @route   DELETE /api/bulk-sender/scheduled/:id
// @access  Private
exports.cancelScheduledBulkMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    if (!user.scheduledBulkMessages) {
      return res.status(404).json({ success: false, message: 'No scheduled messages found' });
    }

    const messageIndex = user.scheduledBulkMessages.findIndex(msg => msg._id.toString() === id);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, message: 'Scheduled message not found' });
    }

    user.scheduledBulkMessages.splice(messageIndex, 1);
    await user.save();

    res.status(200).json({ success: true, message: 'Scheduled bulk message cancelled' });
  } catch (error) {
    console.error('Cancel scheduled bulk message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bulk message history
// @route   GET /api/bulk-sender/history
// @access  Private
exports.getBulkMessageHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { limit = 20, offset = 0 } = req.query;

    const bulkMessages = await Message.find({
      sender: user._id,
      bulkMessage: true
    })
      .populate('conversationId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Message.countDocuments({
      sender: user._id,
      bulkMessage: true
    });

    res.status(200).json({
      success: true,
      messages: bulkMessages,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get bulk message history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bulk message delivery status
// @route   GET /api/bulk-sender/delivery/:batchId
// @access  Private
exports.getBulkMessageDeliveryStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { batchId } = req.params;

    const messages = await Message.find({
      sender: user._id,
      bulkBatchId: batchId
    });

    const delivered = messages.filter(msg => msg.status === 'delivered').length;
    const failed = messages.filter(msg => msg.status === 'failed').length;
    const pending = messages.filter(msg => msg.status === 'sent').length;

    res.status(200).json({
      success: true,
      batchId,
      total: messages.length,
      delivered,
      failed,
      pending,
      messages
    });
  } catch (error) {
    console.error('Get bulk message delivery status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle bulk sending
// @route   POST /api/bulk-sender/toggle
// @access  Private
exports.toggleBulkSending = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.bulkSenderSettings?.toObject?.() || user.bulkSenderSettings || {};
    
    user.bulkSenderSettings = mergeSettings({
      ...existing,
      bulkSendingEnabled: enabled !== undefined ? enabled : !existing.bulkSendingEnabled
    });
    user.markModified('bulkSenderSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.bulkSenderSettings });
  } catch (error) {
    console.error('Toggle bulk sending error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset bulk sender settings to default
// @route   POST /api/bulk-sender/reset
// @access  Private
exports.resetBulkSenderSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.bulkSenderSettings = mergeSettings({});
    user.markModified('bulkSenderSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.bulkSenderSettings });
  } catch (error) {
    console.error('Reset bulk sender settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
