const User = require('../models/User');
const Message = require('../models/Message');

const defaultSettings = {
  noForwardLabelEnabled: true,
  hideForwardTag: true,
  applyToAll: false,
  specificConversations: [],
  excludeConversations: [],
  showOriginalSender: true,
  showForwardCount: false,
  autoRemoveAfter: 0, // 0 = never remove
  logForwardedMessages: true
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

// @desc    Get no forward label settings
// @route   GET /api/no-forward-label/settings
// @access  Private
exports.getNoForwardLabelSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get no forward label settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update no forward label settings
// @route   POST /api/no-forward-label/settings
// @access  Private
exports.updateNoForwardLabelSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings || {};
    
    user.noForwardLabelSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Update no forward label settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forward message without label
// @route   POST /api/no-forward-label/forward
// @access  Private
exports.forwardMessageWithoutLabel = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId, targetConversationId } = req.body;

    if (!messageId || !targetConversationId) {
      return res.status(400).json({ success: false, message: 'Message ID and target conversation ID are required' });
    }

    const settings = mergeSettings(user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings);
    
    if (!settings.noForwardLabelEnabled) {
      return res.status(403).json({ success: false, message: 'No forward label is disabled' });
    }

    // Check if this conversation should have no forward label
    const shouldApply = settings.applyToAll || 
                       settings.specificConversations.includes(targetConversationId) ||
                       !settings.excludeConversations.includes(targetConversationId);

    if (!shouldApply) {
      return res.status(403).json({ success: false, message: 'Forward label will be shown for this conversation' });
    }

    // Get original message
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ success: false, message: 'Original message not found' });
    }

    // Create forwarded message without forward label
    const forwardedMessage = new Message({
      sender: user._id,
      conversation: targetConversationId,
      content: originalMessage.content,
      messageType: originalMessage.messageType,
      media: originalMessage.media,
      forwardedFrom: settings.showOriginalSender ? originalMessage.sender : null,
      forwardCount: settings.showForwardCount ? (originalMessage.forwardCount || 0) + 1 : 0,
      hideForwardLabel: true,
      createdAt: new Date()
    });

    await forwardedMessage.save();

    // Log forwarded message if enabled
    if (settings.logForwardedMessages) {
      if (!user.forwardedMessagesLog) user.forwardedMessagesLog = [];
      user.forwardedMessagesLog.push({
        originalMessageId: messageId,
        forwardedMessageId: forwardedMessage._id,
        targetConversationId,
        timestamp: new Date()
      });
      await user.save();
    }

    res.status(200).json({ success: true, message: forwardedMessage });
  } catch (error) {
    console.error('Forward message without label error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to specific list
// @route   POST /api/no-forward-label/conversation
// @access  Private
exports.addConversationToSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings || {};
    
    if (!existing.specificConversations) existing.specificConversations = [];
    
    if (!existing.specificConversations.includes(conversationId)) {
      existing.specificConversations.push(conversationId);
    }

    user.noForwardLabelSettings = mergeSettings({ ...existing });
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Add conversation to specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from specific list
// @route   DELETE /api/no-forward-label/conversation/:conversationId
// @access  Private
exports.removeConversationFromSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings || {};
    
    if (existing.specificConversations) {
      existing.specificConversations = existing.specificConversations.filter(id => id !== conversationId);
    }

    user.noForwardLabelSettings = mergeSettings({ ...existing });
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Remove conversation from specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to exclude list
// @route   POST /api/no-forward-label/exclude
// @access  Private
exports.addConversationToExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings || {};
    
    if (!existing.excludeConversations) existing.excludeConversations = [];
    
    if (!existing.excludeConversations.includes(conversationId)) {
      existing.excludeConversations.push(conversationId);
    }

    user.noForwardLabelSettings = mergeSettings({ ...existing });
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Add conversation to exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from exclude list
// @route   DELETE /api/no-forward-label/exclude/:conversationId
// @access  Private
exports.removeConversationFromExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings || {};
    
    if (existing.excludeConversations) {
      existing.excludeConversations = existing.excludeConversations.filter(id => id !== conversationId);
    }

    user.noForwardLabelSettings = mergeSettings({ ...existing });
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Remove conversation from exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get forwarded messages log
// @route   GET /api/no-forward-label/log
// @access  Private
exports.getForwardedMessagesLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const log = user.forwardedMessagesLog || [];
    const { limit } = req.query;
    
    const logLimit = parseInt(limit) || 100;
    const recentLog = log.slice(0, logLimit);

    res.status(200).json({ success: true, log: recentLog });
  } catch (error) {
    console.error('Get forwarded messages log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear forwarded messages log
// @route   DELETE /api/no-forward-label/log
// @access  Private
exports.clearForwardedMessagesLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.forwardedMessagesLog = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Forwarded messages log cleared' });
  } catch (error) {
    console.error('Clear forwarded messages log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle no forward label
// @route   POST /api/no-forward-label/toggle
// @access  Private
exports.toggleNoForwardLabel = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.noForwardLabelSettings?.toObject?.() || user.noForwardLabelSettings || {};
    
    user.noForwardLabelSettings = mergeSettings({
      ...existing,
      noForwardLabelEnabled: enabled !== undefined ? enabled : !existing.noForwardLabelEnabled
    });
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Toggle no forward label error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset no forward label settings to default
// @route   POST /api/no-forward-label/reset
// @access  Private
exports.resetNoForwardLabelSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.noForwardLabelSettings = mergeSettings({});
    user.markModified('noForwardLabelSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.noForwardLabelSettings });
  } catch (error) {
    console.error('Reset no forward label settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
