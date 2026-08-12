/**
 * messageProtectionController.js
 * ------------------------------
 * Consolidated controller for anti-ban + anti-revoke (REFACTOR_PLAN.md
 * step 6 — merges antiBanController.js + antiRevokeController.js).
 *
 * Both controllers share the user-scoped settings scaffolding; their
 * toggle handlers were near-identical copies. This file keeps every
 * exported handler name and route path intact — only the internal
 * wiring is shared now.
 *
 *   /api/anti-ban/...    →  settings + toggles + rate-limit/activity handlers
 *   /api/anti-revoke/... →  settings + deleted-message cache handlers
 */

const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const {
  getUser,
  createSettingsMerger,
  createSettingsHandlers,
  createToggleHandler
} = require('../services/userScopedService');

// ── Anti-ban (route prefix /api/anti-ban) ───────────────────────────────────

const ANTI_BAN_DEFAULTS = {
  antiBanEnabled: true,
  deviceSpoof: false,
  ipMask: false,
  secureMode: true,
  rateLimiting: true,
  messageDelay: 1000, // milliseconds
  maxMessagesPerMinute: 60,
  maxMessagesPerHour: 1000,
  detectSuspiciousActivity: true,
  autoBanProtection: true,
  hideDeviceInfo: false,
  randomizeUserAgent: false,
  useProxy: false,
  proxyList: [],
  banThreshold: 5,
  cooldownPeriod: 300 // seconds
};

// Strip explicit `key: undefined` from incoming updates BEFORE merging so
// defaults are never shadowed (e.g. updateRateLimiting writing
// maxMessagesPerHour: undefined when the user has no settings yet). Mongoose
// drops undefined on save anyway — this keeps the in-memory object consistent.
const compactUndefined = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) delete obj[key];
  });
  return obj;
};

const mergeAntiBanSettings = (settings = {}) => createSettingsMerger(ANTI_BAN_DEFAULTS)(compactUndefined(settings));

// @desc    Get anti-ban settings
// @route   GET /api/anti-ban/settings
// @access  Private
const {
  getSettings: getAntiBanSettings,
  updateSettings: updateAntiBanSettings,
  resetSettings: resetAntiBanSettings
} = createSettingsHandlers({
  field: 'antiBanSettings',
  label: 'anti-ban',
  mergeSettings: mergeAntiBanSettings,
});

exports.getAntiBanSettings = getAntiBanSettings;

// @desc    Update anti-ban settings
// @route   POST /api/anti-ban/settings
// @access  Private
exports.updateAntiBanSettings = updateAntiBanSettings;

const toggleAntiBanField = createToggleHandler({
  settingsField: 'antiBanSettings',
  merge: mergeAntiBanSettings,
  acceptEnabled: true,
});

// @desc    Toggle anti-ban
// @route   POST /api/anti-ban/toggle
// @access  Private
exports.toggleAntiBan = (req, res) => toggleAntiBanField(req, res, 'antiBanEnabled', 'Toggle anti-ban');

// @desc    Toggle device spoof
// @route   POST /api/anti-ban/device-spoof
// @access  Private
exports.toggleDeviceSpoof = (req, res) => toggleAntiBanField(req, res, 'deviceSpoof', 'Toggle device spoof');

// @desc    Toggle IP mask
// @route   POST /api/anti-ban/ip-mask
// @access  Private
exports.toggleIPMask = (req, res) => toggleAntiBanField(req, res, 'ipMask', 'Toggle IP mask');

// @desc    Toggle secure mode
// @route   POST /api/anti-ban/secure-mode
// @access  Private
exports.toggleSecureMode = (req, res) => toggleAntiBanField(req, res, 'secureMode', 'Toggle secure mode');

// @desc    Update rate limiting settings
// @route   POST /api/anti-ban/rate-limiting
// @access  Private
exports.updateRateLimiting = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageDelay, maxMessagesPerMinute, maxMessagesPerHour } = req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};

    user.antiBanSettings = mergeAntiBanSettings({
      ...existing,
      messageDelay: messageDelay !== undefined ? messageDelay : existing.messageDelay,
      maxMessagesPerMinute: maxMessagesPerMinute !== undefined ? maxMessagesPerMinute : existing.maxMessagesPerMinute,
      maxMessagesPerHour: maxMessagesPerHour !== undefined ? maxMessagesPerHour : existing.maxMessagesPerHour
    });
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Update rate limiting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check message rate limit
// @route   POST /api/anti-ban/check-rate-limit
// @access  Private
exports.checkRateLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeAntiBanSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);

    if (!settings.rateLimiting || !settings.antiBanEnabled) {
      return res.status(200).json({
        success: true,
        allowed: true,
        message: 'Rate limiting is disabled'
      });
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now - 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    // Get user's recent messages (this would be tracked in a real implementation)
    // For now, use a simple counter stored in user document
    const messageCount = user.messageCount || { minute: 0, hour: 0, lastReset: now };

    // Reset counters if needed
    if (now - messageCount.lastReset > 60 * 1000) {
      messageCount.minute = 0;
      messageCount.lastReset = now;
    }

    const minuteAllowed = messageCount.minute < settings.maxMessagesPerMinute;
    const hourAllowed = messageCount.hour < settings.maxMessagesPerHour;

    res.status(200).json({
      success: true,
      allowed: minuteAllowed && hourAllowed,
      minuteCount: messageCount.minute,
      minuteLimit: settings.maxMessagesPerMinute,
      hourCount: messageCount.hour,
      hourLimit: settings.maxMessagesPerHour,
      messageDelay: settings.messageDelay
    });
  } catch (error) {
    console.error('Check rate limit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record suspicious activity
// @route   POST /api/anti-ban/suspicious-activity
// @access  Private
exports.recordSuspiciousActivity = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { activityType, description } = req.body;

    if (!activityType) {
      return res.status(400).json({ success: false, message: 'Activity type is required' });
    }

    const settings = mergeAntiBanSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);

    if (!settings.detectSuspiciousActivity) {
      return res.status(200).json({
        success: true,
        message: 'Suspicious activity detection is disabled'
      });
    }

    const suspiciousActivity = {
      _id: new (require('mongoose').Types.ObjectId)(),
      type: activityType,
      description: description || '',
      timestamp: new Date(),
      severity: 'medium'
    };

    if (!user.suspiciousActivities) user.suspiciousActivities = [];
    user.suspiciousActivities.push(suspiciousActivity);
    user.markModified('suspiciousActivities');

    // Check if threshold reached
    const recentActivities = user.suspiciousActivities.filter(
      a => new Date() - new Date(a.timestamp) < settings.cooldownPeriod * 1000
    );

    if (recentActivities.length >= settings.banThreshold) {
      user.warningLevel = 'high';
      user.warningUntil = new Date(Date.now() + settings.cooldownPeriod * 1000);
    }

    await user.save();

    res.status(200).json({
      success: true,
      activity: suspiciousActivity,
      recentActivityCount: recentActivities.length,
      threshold: settings.banThreshold,
      warningLevel: user.warningLevel
    });
  } catch (error) {
    console.error('Record suspicious activity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get security status
// @route   GET /api/anti-ban/security-status
// @access  Private
exports.getSecurityStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeAntiBanSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);

    const recentActivities = (user.suspiciousActivities || []).filter(
      a => new Date() - new Date(a.timestamp) < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const status = {
      antiBanEnabled: settings.antiBanEnabled,
      secureMode: settings.secureMode,
      deviceSpoof: settings.deviceSpoof,
      ipMask: settings.ipMask,
      rateLimiting: settings.rateLimiting,
      warningLevel: user.warningLevel || 'none',
      warningUntil: user.warningUntil || null,
      recentSuspiciousActivities: recentActivities.length,
      securityScore: calculateSecurityScore(settings, recentActivities.length)
    };

    res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('Get security status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function calculateSecurityScore(settings, suspiciousCount) {
  let score = 100;

  if (!settings.antiBanEnabled) score -= 30;
  if (!settings.secureMode) score -= 20;
  if (!settings.rateLimiting) score -= 15;
  if (!settings.deviceSpoof) score -= 10;
  if (!settings.ipMask) score -= 10;

  score -= suspiciousCount * 5;

  return Math.max(0, score);
}

// @desc    Clear warning level
// @route   POST /api/anti-ban/clear-warning
// @access  Private
exports.clearWarning = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.warningLevel = 'none';
    user.warningUntil = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Warning cleared' });
  } catch (error) {
    console.error('Clear warning error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset anti-ban settings to default
// @route   POST /api/anti-ban/reset
// @access  Private
exports.resetAntiBanSettings = resetAntiBanSettings;

// ── Anti-revoke (route prefix /api/anti-revoke) ─────────────────────────────

const ANTI_REVOKE_DEFAULTS = {
  antiRevokeEnabled: false,
  cacheDeletedMessages: true,
  showDeletedMessages: true,
  markAsDeleted: true,
  autoDeleteCache: true,
  cacheRetentionDays: 7,
  notifyOnDelete: false
};

const mergeAntiRevokeSettings = createSettingsMerger(ANTI_REVOKE_DEFAULTS);

// @desc    Get anti-revoke settings
// @route   GET /api/anti-revoke/settings
// @access  Private
const {
  getSettings: getAntiRevokeSettings,
  updateSettings: updateAntiRevokeSettings,
  resetSettings: resetAntiRevokeSettings
} = createSettingsHandlers({
  field: 'antiRevokeSettings',
  label: 'anti-revoke',
  mergeSettings: mergeAntiRevokeSettings,
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

    const settings = mergeAntiRevokeSettings(user.antiRevokeSettings?.toObject?.() || user.antiRevokeSettings);

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

    const settings = mergeAntiRevokeSettings(user.antiRevokeSettings?.toObject?.() || user.antiRevokeSettings);
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

const toggleAntiRevokeField = createToggleHandler({
  settingsField: 'antiRevokeSettings',
  merge: mergeAntiRevokeSettings,
  acceptEnabled: true,
});

// @desc    Toggle anti-revoke
// @route   POST /api/anti-revoke/toggle
// @access  Private
exports.toggleAntiRevoke = (req, res) => toggleAntiRevokeField(req, res, 'antiRevokeEnabled', 'Toggle anti-revoke');

// @desc    Reset anti-revoke settings to default
// @route   POST /api/anti-revoke/reset
// @access  Private
exports.resetAntiRevokeSettings = resetAntiRevokeSettings;
