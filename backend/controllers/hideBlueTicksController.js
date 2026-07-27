const User = require('../models/User');
const Message = require('../models/Message');

const defaultSettings = {
  hideBlueTicksEnabled: true,
  keepGreyAfterRead: true,
  applyToAll: false,
  specificConversations: [],
  excludeConversations: [],
  showSingleTick: true,
  showDoubleTickGrey: true,
  showBlueTickOnlyOnRequest: false,
  logReadMessages: true
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

// @desc    Get hide blue ticks settings
// @route   GET /api/hide-blue-ticks/settings
// @access  Private
exports.getHideBlueTicksSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get hide blue ticks settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update hide blue ticks settings
// @route   POST /api/hide-blue-ticks/settings
// @access  Private
exports.updateHideBlueTicksSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings || {};
    
    user.hideBlueTicksSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Update hide blue ticks settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark message as read without blue tick
// @route   POST /api/hide-blue-ticks/read
// @access  Private
exports.markAsReadWithoutBlueTick = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { messageId, conversationId } = req.body;

    if (!messageId || !conversationId) {
      return res.status(400).json({ success: false, message: 'Message ID and conversation ID are required' });
    }

    const settings = mergeSettings(user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings);
    
    if (!settings.hideBlueTicksEnabled) {
      return res.status(403).json({ success: false, message: 'Hide blue ticks is disabled' });
    }

    // Check if this conversation should have blue ticks hidden
    const shouldApply = settings.applyToAll || 
                       settings.specificConversations.includes(conversationId) ||
                       !settings.excludeConversations.includes(conversationId);

    if (!shouldApply) {
      return res.status(403).json({ success: false, message: 'Blue ticks will be shown for this conversation' });
    }

    // Get the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Mark as read but keep grey ticks
    message.readBy = message.readBy || [];
    if (!message.readBy.includes(user._id.toString())) {
      message.readBy.push(user._id.toString());
    }
    message.hideBlueTick = true;
    message.readAt = new Date();
    await message.save();

    // Log read message if enabled
    if (settings.logReadMessages) {
      if (!user.readMessagesLog) user.readMessagesLog = [];
      user.readMessagesLog.push({
        messageId,
        conversationId,
        timestamp: new Date()
      });
      await user.save();
    }

    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Mark as read without blue tick error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to specific list
// @route   POST /api/hide-blue-ticks/conversation
// @access  Private
exports.addConversationToSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings || {};
    
    if (!existing.specificConversations) existing.specificConversations = [];
    
    if (!existing.specificConversations.includes(conversationId)) {
      existing.specificConversations.push(conversationId);
    }

    user.hideBlueTicksSettings = mergeSettings({ ...existing });
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Add conversation to specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from specific list
// @route   DELETE /api/hide-blue-ticks/conversation/:conversationId
// @access  Private
exports.removeConversationFromSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings || {};
    
    if (existing.specificConversations) {
      existing.specificConversations = existing.specificConversations.filter(id => id !== conversationId);
    }

    user.hideBlueTicksSettings = mergeSettings({ ...existing });
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Remove conversation from specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to exclude list
// @route   POST /api/hide-blue-ticks/exclude
// @access  Private
exports.addConversationToExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings || {};
    
    if (!existing.excludeConversations) existing.excludeConversations = [];
    
    if (!existing.excludeConversations.includes(conversationId)) {
      existing.excludeConversations.push(conversationId);
    }

    user.hideBlueTicksSettings = mergeSettings({ ...existing });
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Add conversation to exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from exclude list
// @route   DELETE /api/hide-blue-ticks/exclude/:conversationId
// @access  Private
exports.removeConversationFromExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings || {};
    
    if (existing.excludeConversations) {
      existing.excludeConversations = existing.excludeConversations.filter(id => id !== conversationId);
    }

    user.hideBlueTicksSettings = mergeSettings({ ...existing });
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Remove conversation from exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get read messages log
// @route   GET /api/hide-blue-ticks/log
// @access  Private
exports.getReadMessagesLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const log = user.readMessagesLog || [];
    const { limit } = req.query;
    
    const logLimit = parseInt(limit) || 100;
    const recentLog = log.slice(0, logLimit);

    res.status(200).json({ success: true, log: recentLog });
  } catch (error) {
    console.error('Get read messages log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear read messages log
// @route   DELETE /api/hide-blue-ticks/log
// @access  Private
exports.clearReadMessagesLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.readMessagesLog = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Read messages log cleared' });
  } catch (error) {
    console.error('Clear read messages log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle hide blue ticks
// @route   POST /api/hide-blue-ticks/toggle
// @access  Private
exports.toggleHideBlueTicks = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.hideBlueTicksSettings?.toObject?.() || user.hideBlueTicksSettings || {};
    
    user.hideBlueTicksSettings = mergeSettings({
      ...existing,
      hideBlueTicksEnabled: enabled !== undefined ? enabled : !existing.hideBlueTicksEnabled
    });
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Toggle hide blue ticks error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset hide blue ticks settings to default
// @route   POST /api/hide-blue-ticks/reset
// @access  Private
exports.resetHideBlueTicksSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.hideBlueTicksSettings = mergeSettings({});
    user.markModified('hideBlueTicksSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.hideBlueTicksSettings });
  } catch (error) {
    console.error('Reset hide blue ticks settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
