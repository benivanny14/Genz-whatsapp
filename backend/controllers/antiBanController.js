
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
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
const compact = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) delete obj[key];
  });
  return obj;
};

const mergeSettings = (settings = {}) => createSettingsMerger(defaultSettings)(compact(settings));

// @desc    Get anti-ban settings
// @route   GET /api/anti-ban/settings
// @access  Private
exports.getAntiBanSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get anti-ban settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update anti-ban settings
// @route   POST /api/anti-ban/settings
// @access  Private
exports.updateAntiBanSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};
    
    user.antiBanSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Update anti-ban settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle anti-ban
// @route   POST /api/anti-ban/toggle
// @access  Private
exports.toggleAntiBan = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};
    
    user.antiBanSettings = mergeSettings({
      ...existing,
      antiBanEnabled: enabled !== undefined ? enabled : !existing.antiBanEnabled
    });
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Toggle anti-ban error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle device spoof
// @route   POST /api/anti-ban/device-spoof
// @access  Private
exports.toggleDeviceSpoof = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};
    
    user.antiBanSettings = mergeSettings({
      ...existing,
      deviceSpoof: enabled !== undefined ? enabled : !existing.deviceSpoof
    });
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Toggle device spoof error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle IP mask
// @route   POST /api/anti-ban/ip-mask
// @access  Private
exports.toggleIPMask = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};
    
    user.antiBanSettings = mergeSettings({
      ...existing,
      ipMask: enabled !== undefined ? enabled : !existing.ipMask
    });
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Toggle IP mask error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle secure mode
// @route   POST /api/anti-ban/secure-mode
// @access  Private
exports.toggleSecureMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};
    
    user.antiBanSettings = mergeSettings({
      ...existing,
      secureMode: enabled !== undefined ? enabled : !existing.secureMode
    });
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Toggle secure mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update rate limiting settings
// @route   POST /api/anti-ban/rate-limiting
// @access  Private
exports.updateRateLimiting = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageDelay, maxMessagesPerMinute, maxMessagesPerHour } = req.body;
    const existing = user.antiBanSettings?.toObject?.() || user.antiBanSettings || {};
    
    user.antiBanSettings = mergeSettings({
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

    const settings = mergeSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);
    
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

    const settings = mergeSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);
    
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

    const settings = mergeSettings(user.antiBanSettings?.toObject?.() || user.antiBanSettings);
    
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
exports.resetAntiBanSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.antiBanSettings = mergeSettings({});
    user.markModified('antiBanSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.antiBanSettings });
  } catch (error) {
    console.error('Reset anti-ban settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

