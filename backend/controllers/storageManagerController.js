
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const fs = require('fs').promises;
const path = require('path');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  autoCleanup: false,
  cleanupInterval: 7, // days
  maxStorageSize: 1024, // MB
  warnAtStorage: 80, // percentage
  deleteOldMedia: false,
  deleteOldMessages: false,
  compressStorage: false,
  backupBeforeCleanup: true,
  keepStarredMessages: true,
  keepImportantConversations: true
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get storage manager settings
// @route   GET /api/storage-manager/settings
// @access  Private
exports.getStorageManagerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.storageManagerSettings?.toObject?.() || user.storageManagerSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get storage manager settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update storage manager settings
// @route   POST /api/storage-manager/settings
// @access  Private
exports.updateStorageManagerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.storageManagerSettings?.toObject?.() || user.storageManagerSettings || {};
    
    user.storageManagerSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('storageManagerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.storageManagerSettings });
  } catch (error) {
    console.error('Update storage manager settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get storage usage
// @route   GET /api/storage-manager/usage
// @access  Private
exports.getStorageUsage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const conversations = await Conversation.find({
      participants: user._id
    });

    const conversationIds = conversations.map(c => c._id);
    const messages = await Message.find({
      conversationId: { $in: conversationIds }
    });

    // Calculate storage by type
    const mediaMessages = messages.filter(m => m.mediaUrl);
    const textMessages = messages.filter(m => !m.mediaUrl);

    // Estimate sizes (in real implementation, calculate actual file sizes)
    const estimatedMediaSize = mediaMessages.length * 2; // Assume 2MB per media
    const estimatedTextSize = textMessages.length * 0.001; // Assume 1KB per text
    const totalEstimatedSize = estimatedMediaSize + estimatedTextSize;

    const settings = mergeSettings(user.storageManagerSettings?.toObject?.() || user.storageManagerSettings);
    const maxStorage = settings.maxStorageSize;
    const usagePercentage = (totalEstimatedSize / maxStorage) * 100;

    const breakdown = {
      messages: {
        total: messages.length,
        text: textMessages.length,
        media: mediaMessages.length,
        estimatedSize: totalEstimatedSize.toFixed(2)
      },
      conversations: {
        total: conversations.length,
        groups: conversations.filter(c => c.isGroup).length,
        individual: conversations.filter(c => !c.isGroup).length
      },
      storage: {
        used: totalEstimatedSize.toFixed(2),
        max: maxStorage,
        available: (maxStorage - totalEstimatedSize).toFixed(2),
        percentage: usagePercentage.toFixed(2),
        warningLevel: usagePercentage > settings.warnAtStorage ? 'warning' : 'normal'
      }
    };

    res.status(200).json({ success: true, breakdown });
  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clean up old messages
// @route   POST /api/storage-manager/cleanup-messages
// @access  Private
exports.cleanupOldMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // SAFETY: this used to run Message.deleteMany() scoped only by date,
    // across every conversation the user is in — permanently deleting
    // history for every other participant, not just this user's copy.
    // Disabled until redesigned as a per-user "hide" rather than a shared
    // delete. Real local cache trimming already works via StorageManagement.jsx.
    return res.status(501).json({
      success: false,
      message: 'Server-side message cleanup is disabled because it would permanently delete chat history for other participants too, not just you.'
    });
  } catch (error) {
    console.error('Cleanup old messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clean up old media
// @route   POST /api/storage-manager/cleanup-media
// @access  Private
exports.cleanupOldMedia = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // SAFETY: this used to strip mediaUrl from shared Message documents
    // across every conversation the user is in, removing media for every
    // other participant too. Disabled until redesigned per-user.
    return res.status(501).json({
      success: false,
      message: 'Server-side media cleanup is disabled because it would remove media for other participants too, not just you.'
    });
  } catch (error) {
    console.error('Cleanup old media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear cache
// @route   POST /api/storage-manager/clear-cache
// @access  Private
exports.clearCache = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // Clear user-specific cache data
    user.cacheData = {};
    user.markModified('cacheData');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Compress storage
// @route   POST /api/storage-manager/compress
// @access  Private
exports.compressStorage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // In real implementation, this would compress stored data
    // For now, just update the compression timestamp
    user.lastCompressedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Storage compression initiated',
      compressedAt: user.lastCompressedAt
    });
  } catch (error) {
    console.error('Compress storage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get storage breakdown by conversation
// @route   GET /api/storage-manager/conversation-breakdown
// @access  Private
exports.getConversationBreakdown = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const conversations = await Conversation.find({
      participants: user._id
    });

    const breakdown = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await Message.find({ conversationId: conv._id });
        const mediaCount = messages.filter(m => m.mediaUrl).length;
        const textCount = messages.filter(m => !m.mediaUrl).length;
        
        return {
          conversationId: conv._id,
          name: conv.name || 'Unknown',
          isGroup: conv.isGroup,
          messageCount: messages.length,
          mediaCount,
          textCount,
          estimatedSize: (mediaCount * 2 + textCount * 0.001).toFixed(2)
        };
      })
    );

    // Sort by size
    breakdown.sort((a, b) => parseFloat(b.estimatedSize) - parseFloat(a.estimatedSize));

    res.status(200).json({ success: true, breakdown });
  } catch (error) {
    console.error('Get conversation breakdown error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle auto cleanup
// @route   POST /api/storage-manager/auto-cleanup
// @access  Private
exports.toggleAutoCleanup = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.storageManagerSettings?.toObject?.() || user.storageManagerSettings || {};
    
    user.storageManagerSettings = mergeSettings({
      ...existing,
      autoCleanup: enabled !== undefined ? enabled : !existing.autoCleanup
    });
    user.markModified('storageManagerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.storageManagerSettings });
  } catch (error) {
    console.error('Toggle auto cleanup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset storage manager settings to default
// @route   POST /api/storage-manager/reset
// @access  Private
exports.resetStorageManagerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.storageManagerSettings = mergeSettings({});
    user.markModified('storageManagerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.storageManagerSettings });
  } catch (error) {
    console.error('Reset storage manager settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

