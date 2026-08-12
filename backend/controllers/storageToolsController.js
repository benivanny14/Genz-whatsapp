/**
 * storageToolsController.js
 * -------------------------
 * Consolidated controller for data usage + storage manager
 * (REFACTOR_PLAN.md step 6 — merges dataUsageController.js +
 * storageManagerController.js).
 *
 * Every exported handler name and route path stays intact; the shared
 * toggle handlers now use one generic createToggleHandler.
 *
 *   /api/data-usage/...      →  settings + stats/limit handlers
 *   /api/storage-manager/... →  settings + usage/cleanup handlers
 */

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const {
  getUser,
  createSettingsMerger,
  createSettingsHandlers,
  createToggleHandler
} = require('../services/userScopedService');

// ── Data usage (route prefix /api/data-usage) ───────────────────────────────

const DATA_USAGE_DEFAULTS = {
  dataUsageTrackingEnabled: true,
  trackMobileData: true,
  trackWiFiData: true,
  dataLimitEnabled: false,
  dataLimitMB: 1000,
  warnAtPercentage: 80,
  resetDate: 'monthly', // daily, weekly, monthly
  trackByApp: false,
  trackByConversation: true,
  enableDataSaver: false,
  compressImages: true,
  compressVideos: true,
  autoDownloadOnWiFi: true,
  autoDownloadOnMobile: false
};

const mergeDataUsageSettings = createSettingsMerger(DATA_USAGE_DEFAULTS);

// @desc    Get data usage settings
// @route   GET /api/data-usage/settings
// @access  Private
const {
  getSettings: getDataUsageSettings,
  updateSettings: updateDataUsageSettings,
  resetSettings: resetDataUsageSettings
} = createSettingsHandlers({
  field: 'dataUsageSettings',
  label: 'data usage',
  mergeSettings: mergeDataUsageSettings,
});

exports.getDataUsageSettings = getDataUsageSettings;

// @desc    Update data usage settings
// @route   POST /api/data-usage/settings
// @access  Private
exports.updateDataUsageSettings = updateDataUsageSettings;

// @desc    Get data usage statistics
// @route   GET /api/data-usage/stats
// @access  Private
exports.getDataUsageStats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { period } = req.query; // daily, weekly, monthly

    const settings = mergeDataUsageSettings(user.dataUsageSettings?.toObject?.() || user.dataUsageSettings);

    if (!settings.dataUsageTrackingEnabled) {
      return res.status(403).json({ success: false, message: 'Data usage tracking is disabled' });
    }

    const now = new Date();
    let startDate;

    switch (period || settings.resetDate) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
    }

    const conversations = await Conversation.find({ participants: user._id });
    const conversationIds = conversations.map(c => c._id);

    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      createdAt: { $gte: startDate }
    });

    // Estimate data usage (in real implementation, track actual bytes)
    const mediaMessages = messages.filter(m => m.mediaUrl);
    const textMessages = messages.filter(m => !m.mediaUrl);

    const estimatedMobileData = mediaMessages.length * 2 + textMessages.length * 0.001; // MB
    const estimatedWiFiData = estimatedMobileData; // Would be tracked separately in real implementation

    const byType = {
      images: mediaMessages.filter(m => m.messageType === 'image').length * 2,
      videos: mediaMessages.filter(m => m.messageType === 'video').length * 5,
      audio: mediaMessages.filter(m => m.messageType === 'audio').length * 1,
      documents: mediaMessages.filter(m => m.messageType === 'document').length * 0.5,
      text: textMessages.length * 0.001
    };

    const stats = {
      period: period || settings.resetDate,
      startDate,
      endDate: new Date(),
      totalDataUsage: estimatedMobileData + estimatedWiFiData,
      mobileData: estimatedMobileData,
      wifiData: estimatedWiFiData,
      byType,
      messageCount: messages.length,
      mediaCount: mediaMessages.length,
      textCount: textMessages.length
    };

    if (settings.dataLimitEnabled) {
      const percentageUsed = (stats.totalDataUsage / settings.dataLimitMB) * 100;
      stats.dataLimit = settings.dataLimitMB;
      stats.percentageUsed = percentageUsed.toFixed(2);
      stats.warningLevel = percentageUsed > settings.warnAtPercentage ? 'warning' : 'normal';
    }

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Get data usage stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get data usage by conversation
// @route   GET /api/data-usage/by-conversation
// @access  Private
exports.getDataUsageByConversation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { period } = req.query;

    const settings = mergeDataUsageSettings(user.dataUsageSettings?.toObject?.() || user.dataUsageSettings);

    const now = new Date();
    let startDate = new Date(now.setDate(now.getDate() - 30));

    const conversations = await Conversation.find({ participants: user._id });

    const usageByConversation = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await Message.find({
          conversationId: conv._id,
          createdAt: { $gte: startDate }
        });

        const mediaCount = messages.filter(m => m.mediaUrl).length;
        const textCount = messages.filter(m => !m.mediaUrl).length;
        const estimatedUsage = mediaCount * 2 + textCount * 0.001;

        return {
          conversationId: conv._id,
          name: conv.name || 'Unknown',
          isGroup: conv.isGroup,
          messageCount: messages.length,
          mediaCount,
          textCount,
          estimatedUsage
        };
      })
    );

    // Sort by usage
    usageByConversation.sort((a, b) => b.estimatedUsage - a.estimatedUsage);

    res.status(200).json({ success: true, usageByConversation });
  } catch (error) {
    console.error('Get data usage by conversation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleDataUsageField = createToggleHandler({
  settingsField: 'dataUsageSettings',
  merge: mergeDataUsageSettings,
  acceptEnabled: true,
});

// @desc    Toggle data usage tracking
// @route   POST /api/data-usage/toggle
// @access  Private
exports.toggleDataUsageTracking = (req, res) => toggleDataUsageField(req, res, 'dataUsageTrackingEnabled', 'Toggle data usage tracking');

// @desc    Set data limit
// @route   POST /api/data-usage/limit
// @access  Private
exports.setDataLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled, limitMB, warnAtPercentage } = req.body;
    const existing = user.dataUsageSettings?.toObject?.() || user.dataUsageSettings || {};

    user.dataUsageSettings = mergeDataUsageSettings({
      ...existing,
      dataLimitEnabled: enabled !== undefined ? enabled : existing.dataLimitEnabled,
      dataLimitMB: limitMB !== undefined ? limitMB : existing.dataLimitMB,
      warnAtPercentage: warnAtPercentage !== undefined ? warnAtPercentage : existing.warnAtPercentage
    });
    user.markModified('dataUsageSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.dataUsageSettings });
  } catch (error) {
    console.error('Set data limit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle data saver
// @route   POST /api/data-usage/data-saver
// @access  Private
exports.toggleDataSaver = (req, res) => toggleDataUsageField(req, res, 'enableDataSaver', 'Toggle data saver');

// @desc    Reset data usage settings to default
// @route   POST /api/data-usage/reset
// @access  Private
exports.resetDataUsageSettings = resetDataUsageSettings;

// ── Storage manager (route prefix /api/storage-manager) ─────────────────────

const STORAGE_MANAGER_DEFAULTS = {
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

const mergeStorageManagerSettings = createSettingsMerger(STORAGE_MANAGER_DEFAULTS);

// @desc    Get storage manager settings
// @route   GET /api/storage-manager/settings
// @access  Private
const {
  getSettings: getStorageManagerSettings,
  updateSettings: updateStorageManagerSettings,
  resetSettings: resetStorageManagerSettings
} = createSettingsHandlers({
  field: 'storageManagerSettings',
  label: 'storage manager',
  mergeSettings: mergeStorageManagerSettings,
});

exports.getStorageManagerSettings = getStorageManagerSettings;

// @desc    Update storage manager settings
// @route   POST /api/storage-manager/settings
// @access  Private
exports.updateStorageManagerSettings = updateStorageManagerSettings;

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

    const settings = mergeStorageManagerSettings(user.storageManagerSettings?.toObject?.() || user.storageManagerSettings);
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

const toggleStorageManagerField = createToggleHandler({
  settingsField: 'storageManagerSettings',
  merge: mergeStorageManagerSettings,
  acceptEnabled: true,
});

// @desc    Toggle auto cleanup
// @route   POST /api/storage-manager/auto-cleanup
// @access  Private
exports.toggleAutoCleanup = (req, res) => toggleStorageManagerField(req, res, 'autoCleanup', 'Toggle auto cleanup');

// @desc    Reset storage manager settings to default
// @route   POST /api/storage-manager/reset
// @access  Private
exports.resetStorageManagerSettings = resetStorageManagerSettings;
