
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { uploadFile: uploadToMediaStorage } = require('../config/cloudinary');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

const defaultSettings = {
  exportChat: true,
  massMessage: true,
  fakeChatGenerator: true,
  contactPicker: true,
  textTools: true,
  scheduleMessage: true,
  createPoll: true,
  aiStickers: true,
  downloadStatus: true,
  productCatalogue: true,
  notifyWhenOnline: true,
  clearAllChats: true,
  jumpToDate: true,
  quickReactions: true,
  callBlocker: true,
  mediaGallery: true,
  statusReaction: true,
  statusViewers: true,
  groupMembers: true,
  voiceChanger: true
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get quick actions settings
// @route   GET /api/quick-actions/settings
// @access  Private
const { getSettings: getQuickActionsSettings, updateSettings: updateQuickActionsSettings, resetSettings: resetQuickActionsSettings } = createSettingsHandlers({
  field: 'quickActionsSettings',
  label: 'quick actions',
  mergeSettings,
});

exports.getQuickActionsSettings = getQuickActionsSettings;

// @desc    Update quick actions settings
// @route   POST /api/quick-actions/settings
// @access  Private
exports.updateQuickActionsSettings = updateQuickActionsSettings;

// @desc    Send mass message
// @route   POST /api/quick-actions/mass-message
// @access  Private
exports.sendMassMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { recipients, content, messageType, mediaUrl } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients are required' });
    }

    // SECURITY (2.8): cap mass-message recipients per send (same as socket path).
    const MAX_MASS_RECIPIENTS = 20;
    if (recipients.length > MAX_MASS_RECIPIENTS) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_MASS_RECIPIENTS} recipients allowed` });
    }

    // SECURITY (2.8): rate-limit mass messages per user per hour (max 5).
    const recentMassCount = await Message.countDocuments({
      sender: user._id,
      isMassMessage: true,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    if (recentMassCount >= 5) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Content or media URL is required' });
    }

    const results = [];
    const errors = [];

    for (const recipientId of recipients) {
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
          isMassMessage: true
        });

        results.push({ recipientId, messageId: message._id });
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
    console.error('Send mass message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export chat
// @route   POST /api/quick-actions/export-chat
// @access  Private
exports.exportChat = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, format } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    let exportData = '';

    if (format === 'txt') {
      exportData = `Chat Export - ${conversation.name || 'Unknown'}\n`;
      exportData += `Date: ${new Date().toISOString()}\n`;
      exportData += `Total Messages: ${messages.length}\n\n`;
      
      messages.forEach(msg => {
        const sender = msg.sender?.username || 'Unknown';
        const timestamp = new Date(msg.createdAt).toLocaleString();
        exportData += `[${timestamp}] ${sender}: ${msg.content || '[Media]'}\n`;
      });
    } else if (format === 'json') {
      exportData = JSON.stringify({
        conversationId,
        conversationName: conversation.name,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map(msg => ({
          sender: msg.sender?.username,
          content: msg.content,
          messageType: msg.messageType,
          createdAt: msg.createdAt
        }))
      }, null, 2);
    }

    res.status(200).json({
      success: true,
      format,
      data: exportData,
      messageCount: messages.length
    });
  } catch (error) {
    console.error('Export chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all chats
// @route   POST /api/quick-actions/clear-all-chats
// @access  Private
exports.clearAllChats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // SAFETY: this used to run Message.deleteMany() across every
    // conversation the user is in, permanently deleting chat history for
    // every OTHER participant too — not just clearing this user's own view.
    // Disabled until it's redesigned to only hide/clear the user's own copy.
    return res.status(501).json({
      success: false,
      message: 'Clearing all chats from the server is disabled because it would permanently delete chat history for everyone in those conversations, not just you.'
    });
  } catch (error) {
    console.error('Clear all chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Jump to date in chat
// @route   POST /api/quick-actions/jump-to-date
// @access  Private
exports.jumpToDate = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, date } = req.body;

    if (!conversationId || !date) {
      return res.status(400).json({ success: false, message: 'Conversation ID and date are required' });
    }

    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const messages = await Message.find({
      conversationId,
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .populate('sender', 'username profilePicture')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      date: targetDate,
      messageCount: messages.length,
      messages
    });
  } catch (error) {
    console.error('Jump to date error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create poll
// @route   POST /api/quick-actions/create-poll
// @access  Private
exports.createPoll = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, question, options, duration } = req.body;

    if (!conversationId || !question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Conversation ID, question, and at least 2 options are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    const poll = {
      _id: new (require('mongoose').Types.ObjectId)(),
      question,
      options: options.map(opt => ({ text: opt, votes: [], voters: [] })),
      createdBy: user._id,
      createdAt: new Date(),
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000) : null,
      active: true
    };

    // Create poll as a message
    const message = await Message.create({
      conversationId,
      sender: user._id,
      content: question,
      messageType: 'poll',
      poll
    });

    res.status(200).json({ success: true, poll, messageId: message._id });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download status
// @route   POST /api/quick-actions/download-status
// @access  Private
exports.downloadStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.body;

    if (!statusId) {
      return res.status(400).json({ success: false, message: 'Status ID is required' });
    }

    const Status = require('../models/Status');
    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (!status.mediaUrl) {
      return res.status(400).json({ success: false, message: 'Status has no media to download' });
    }

    res.status(200).json({
      success: true,
      mediaUrl: status.mediaUrl,
      mediaType: status.mediaType,
      caption: status.caption
    });
  } catch (error) {
    console.error('Download status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset quick actions settings to default
// @route   POST /api/quick-actions/reset
// @access  Private
exports.resetQuickActionsSettings = resetQuickActionsSettings;

