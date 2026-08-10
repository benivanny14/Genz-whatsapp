
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  liveReactionsEnabled: true,
  showReactions: true,
  sendReactions: true,
  reactionDuration: 5, // seconds
  availableReactions: ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '👏'],
  maxReactionsPerMessage: 10,
  autoHide: true,
  soundEnabled: true
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get live reactions settings
// @route   GET /api/live-reactions/settings
// @access  Private
exports.getLiveReactionsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.liveReactionsSettings?.toObject?.() || user.liveReactionsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get live reactions settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update live reactions settings
// @route   POST /api/live-reactions/settings
// @access  Private
exports.updateLiveReactionsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.liveReactionsSettings?.toObject?.() || user.liveReactionsSettings || {};
    
    user.liveReactionsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('liveReactionsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.liveReactionsSettings });
  } catch (error) {
    console.error('Update live reactions settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send live reaction to message
// @route   POST /api/live-reactions/message/:messageId
// @access  Private
exports.sendLiveReaction = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId } = req.params;
    const { emoji, conversationId } = req.body;

    if (!emoji || !conversationId) {
      return res.status(400).json({ success: false, message: 'Emoji and conversation ID are required' });
    }

    const settings = mergeSettings(user.liveReactionsSettings?.toObject?.() || user.liveReactionsSettings);
    
    if (!settings.liveReactionsEnabled || !settings.sendReactions) {
      return res.status(403).json({ success: false, message: 'Live reactions are disabled' });
    }

    if (!settings.availableReactions.includes(emoji)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction emoji' });
    }

    // Verify conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this conversation' });
    }

    // Verify message exists
    const message = await Message.findById(messageId);
    if (!message || String(message.conversationId || message.conversation) !== String(conversationId)) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const reaction = {
      _id: new (require('mongoose').Types.ObjectId)(),
      emoji,
      userId: user._id,
      username: user.username,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + settings.reactionDuration * 1000)
    };

    // Add reaction to message
    if (!message.liveReactions) message.liveReactions = [];
    
    // Check max reactions limit
    if (message.liveReactions.length >= settings.maxReactionsPerMessage) {
      // Remove oldest reaction
      message.liveReactions.shift();
    }

    message.liveReactions.push(reaction);
    await message.save();

    // Emit socket event for real-time reaction (mock)
    // io.to(conversationId).emit('live-reaction', { messageId, reaction });

    res.status(200).json({ success: true, reaction });
  } catch (error) {
    console.error('Send live reaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get live reactions for message
// @route   GET /api/live-reactions/message/:messageId
// @access  Private
exports.getMessageReactions = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const settings = mergeSettings(user.liveReactionsSettings?.toObject?.() || user.liveReactionsSettings);
    
    if (!settings.liveReactionsEnabled || !settings.showReactions) {
      return res.status(403).json({ success: false, message: 'Live reactions are disabled' });
    }

    // Filter expired reactions
    const now = new Date();
    const activeReactions = (message.liveReactions || []).filter(
      r => !r.expiresAt || new Date(r.expiresAt) > now
    );

    res.status(200).json({ success: true, reactions: activeReactions });
  } catch (error) {
    console.error('Get message reactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove live reaction
// @route   DELETE /api/live-reactions/message/:messageId/:reactionId
// @access  Private
exports.removeLiveReaction = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId, reactionId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const reactions = message.liveReactions || [];
    const reactionIndex = reactions.findIndex(
      r => r._id.toString() === reactionId && r.userId.toString() === user._id.toString()
    );

    if (reactionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Reaction not found' });
    }

    reactions.splice(reactionIndex, 1);
    message.liveReactions = reactions;
    await message.save();

    res.status(200).json({ success: true, message: 'Reaction removed' });
  } catch (error) {
    console.error('Remove live reaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get available reactions
// @route   GET /api/live-reactions/available
// @access  Private
exports.getAvailableReactions = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.liveReactionsSettings?.toObject?.() || user.liveReactionsSettings);
    
    res.status(200).json({ success: true, reactions: settings.availableReactions });
  } catch (error) {
    console.error('Get available reactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear expired reactions (cleanup job)
// @route   POST /api/live-reactions/cleanup
// @access  Private (admin only)
exports.cleanupExpiredReactions = async (req, res) => {
  try {
    const now = new Date();
    
    const result = await Message.updateMany(
      { 'liveReactions.expiresAt': { $lt: now } },
      { $pull: { liveReactions: { expiresAt: { $lt: now } } } }
    );

    res.status(200).json({ 
      success: true, 
      message: `Cleaned up expired reactions from ${result.modifiedCount} messages` 
    });
  } catch (error) {
    console.error('Cleanup expired reactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle live reactions
// @route   POST /api/live-reactions/toggle
// @access  Private
exports.toggleLiveReactions = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.liveReactionsSettings?.toObject?.() || user.liveReactionsSettings || {};
    
    user.liveReactionsSettings = mergeSettings({
      ...existing,
      liveReactionsEnabled: enabled !== undefined ? enabled : !existing.liveReactionsEnabled
    });
    user.markModified('liveReactionsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.liveReactionsSettings });
  } catch (error) {
    console.error('Toggle live reactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset live reactions settings to default
// @route   POST /api/live-reactions/reset
// @access  Private
exports.resetLiveReactionsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.liveReactionsSettings = mergeSettings({});
    user.markModified('liveReactionsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.liveReactionsSettings });
  } catch (error) {
    console.error('Reset live reactions settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

