const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

const defaultSettings = {
  antiRevokeEnabled: false,
  cacheDeletedMessages: true,
  showDeletedMessages: true,
  markAsDeleted: true,
  autoDeleteCache: true,
  cacheRetentionDays: 7,
  notifyOnDelete: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get anti-revoke settings
// @route   GET /api/anti-revoke/settings
// @access  Private
const { getSettings: getAntiRevokeSettings, updateSettings: updateAntiRevokeSettings, resetSettings: resetAntiRevokeSettings } = createSettingsHandlers({
  field: 'antiRevokeSettings',
  label: 'anti-revoke',
  mergeSettings,
});

exports.getAntiRevokeSettings = getAntiRevokeSettings;

// @desc    Update anti-revoke settings
// @route   POST /api/anti-revoke/settings
// @access  Private
exports.updateAntiRevokeSettings = updateAntiRevokeSettings;

// @desc    Cache deleted message (called when message is deleted)
// @route   POST /api/anti-revoke/cache
// @access  Private
exports.cacheDeletedMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId, conversationId, content, messageType, mediaUrl, sender, deletedBy } = req.body;

    if (!messageId || !conversationId) {
      return res.status(400).json({ success: false, message: 'Message ID and conversation ID are required' });
    }

    const settings = mergeSettings(user.antiRevokeSettings?.toObject?.() || user.antiRevokeSettings);
    
    if (!settings.antiRevokeEnabled || !settings.cacheDeletedMessages) {
      return res.status(200).json({ success: true, cached: false, message: 'Anti-revoke not enabled' });
    }

    // Store in user's deleted messages cache
    if (!user.deletedMessagesCache) user.deletedMessagesCache = [];
    
    user.deletedMessagesCache.push({
      messageId,
      conversationId,
      content,
      messageType,
      mediaUrl,
      sender,
      deletedBy,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + settings.cacheRetentionDays * 24 * 60 * 60 * 1000)
    });
    user.markModified('deletedMessagesCache');

    await user.save();

    res.status(200).json({ success: true, cached: true });
  } catch (error) {
    console.error('Cache deleted message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get cached deleted messages
// @route   GET /api/anti-revoke/cached
// @access  Private
exports.getCachedDeletedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.query;

    let cachedMessages = user.deletedMessagesCache || [];

    // Filter by conversation if specified
    if (conversationId) {
      cachedMessages = cachedMessages.filter(msg => msg.conversationId === conversationId);
    }

    // Remove expired messages
    const now = new Date();
    cachedMessages = cachedMessages.filter(msg => !msg.expiresAt || msg.expiresAt > now);

    // Update user's cache
    user.deletedMessagesCache = cachedMessages;
    await user.save();

    res.status(200).json({ success: true, cachedMessages });
  } catch (error) {
    console.error('Get cached deleted messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Spy view: deleted-messages viewer with sender/conversation details
// @route   GET /api/anti-revoke/spy-view
// @access  Private
exports.spyViewDeletedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.antiRevokeSettings?.toObject?.() || user.antiRevokeSettings);
    if (!settings.antiRevokeEnabled || !settings.showDeletedMessages) {
      return res.status(403).json({ success: false, message: 'Anti-revoke viewer is not enabled' });
    }

    const now = new Date();
    const cached = (user.deletedMessagesCache || []).filter(msg => !msg.expiresAt || msg.expiresAt > now);

    // Enrich with sender + conversation details
    const senderIds = [...new Set(cached.map(m => m.sender).filter(Boolean))];
    const conversationIds = [...new Set(cached.map(m => m.conversationId).filter(Boolean))];

    const [senders, conversations] = await Promise.all([
      User.find({ _id: { $in: senderIds } }).select('username phoneNumber profilePicture'),
      Conversation.find({ _id: { $in: conversationIds } }).select('name isGroup participants')
    ]);

    const senderMap = new Map(senders.map(s => [String(s._id), s]));
    const convMap = new Map(conversations.map(c => [String(c._id), c]));

    const messages = cached
      .sort((a, b) => new Date(b.cachedAt || 0) - new Date(a.cachedAt || 0))
      .map(msg => {
        const sender = msg.sender ? senderMap.get(String(msg.sender)) : null;
        const conv = msg.conversationId ? convMap.get(String(msg.conversationId)) : null;
        return {
          messageId: msg.messageId,
          content: msg.content,
          messageType: msg.messageType,
          mediaUrl: msg.mediaUrl,
          deletedBy: msg.deletedBy,
          cachedAt: msg.cachedAt,
          sender: sender ? { _id: sender._id, username: sender.username, phoneNumber: sender.phoneNumber, profilePicture: sender.profilePicture } : null,
          conversation: conv ? { _id: conv._id, name: conv.name || '', isGroup: conv.isGroup } : null
        };
      });

    res.status(200).json({
      success: true,
      total: messages.length,
      messages
    });
  } catch (error) {
    console.error('Spy view deleted messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear cached deleted messages
// @route   DELETE /api/anti-revoke/cached
// @access  Private
exports.clearCachedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId, conversationId } = req.query;

    if (!user.deletedMessagesCache) {
      return res.status(200).json({ success: true, message: 'No cached messages' });
    }

    if (messageId) {
      user.deletedMessagesCache = user.deletedMessagesCache.filter(msg => msg.messageId !== messageId);
    } else if (conversationId) {
      user.deletedMessagesCache = user.deletedMessagesCache.filter(msg => msg.conversationId !== conversationId);
    } else {
      user.deletedMessagesCache = [];
    }

    await user.save();

    res.status(200).json({ success: true, message: 'Cached messages cleared' });
  } catch (error) {
    console.error('Clear cached messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle anti-revoke
// @route   POST /api/anti-revoke/toggle
// @access  Private
exports.toggleAntiRevoke = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.antiRevokeSettings?.toObject?.() || user.antiRevokeSettings || {};
    
    user.antiRevokeSettings = mergeSettings({
      ...existing,
      antiRevokeEnabled: enabled !== undefined ? enabled : !existing.antiRevokeEnabled
    });
    user.markModified('antiRevokeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiRevokeSettings });
  } catch (error) {
    console.error('Toggle anti-revoke error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset anti-revoke settings to default
// @route   POST /api/anti-revoke/reset
// @access  Private
exports.resetAntiRevokeSettings = resetAntiRevokeSettings;

