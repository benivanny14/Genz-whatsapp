const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
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

// @desc    Get data usage settings
// @route   GET /api/data-usage/settings
// @access  Private
exports.getDataUsageSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.dataUsageSettings?.toObject?.() || user.dataUsageSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get data usage settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update data usage settings
// @route   POST /api/data-usage/settings
// @access  Private
exports.updateDataUsageSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.dataUsageSettings?.toObject?.() || user.dataUsageSettings || {};
    
    user.dataUsageSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('dataUsageSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.dataUsageSettings });
  } catch (error) {
    console.error('Update data usage settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get data usage statistics
// @route   GET /api/data-usage/stats
// @access  Private
exports.getDataUsageStats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { period } = req.query; // daily, weekly, monthly

    const settings = mergeSettings(user.dataUsageSettings?.toObject?.() || user.dataUsageSettings);
    
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

    const settings = mergeSettings(user.dataUsageSettings?.toObject?.() || user.dataUsageSettings);
    
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

// @desc    Toggle data usage tracking
// @route   POST /api/data-usage/toggle
// @access  Private
exports.toggleDataUsageTracking = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.dataUsageSettings?.toObject?.() || user.dataUsageSettings || {};
    
    user.dataUsageSettings = mergeSettings({
      ...existing,
      dataUsageTrackingEnabled: enabled !== undefined ? enabled : !existing.dataUsageTrackingEnabled
    });
    user.markModified('dataUsageSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.dataUsageSettings });
  } catch (error) {
    console.error('Toggle data usage tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set data limit
// @route   POST /api/data-usage/limit
// @access  Private
exports.setDataLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled, limitMB, warnAtPercentage } = req.body;
    const existing = user.dataUsageSettings?.toObject?.() || user.dataUsageSettings || {};
    
    user.dataUsageSettings = mergeSettings({
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
exports.toggleDataSaver = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.dataUsageSettings?.toObject?.() || user.dataUsageSettings || {};
    
    user.dataUsageSettings = mergeSettings({
      ...existing,
      enableDataSaver: enabled !== undefined ? enabled : !existing.enableDataSaver
    });
    user.markModified('dataUsageSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.dataUsageSettings });
  } catch (error) {
    console.error('Toggle data saver error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset data usage settings to default
// @route   POST /api/data-usage/reset
// @access  Private
exports.resetDataUsageSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.dataUsageSettings = mergeSettings({});
    user.markModified('dataUsageSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.dataUsageSettings });
  } catch (error) {
    console.error('Reset data usage settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
