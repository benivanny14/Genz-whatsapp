const User = require('../models/User');

const defaultSettings = {
  alwaysOnlineEnabled: true,
  showOnlineEvenWhenOffline: true,
  showLastSeen: true,
  customLastSeen: null,
  hideTyping: false,
  hideRecording: false,
  applyToAll: false,
  specificConversations: [],
  excludeConversations: [],
  scheduleEnabled: false,
  scheduleStart: '09:00',
  scheduleEnd: '22:00',
  timezone: 'UTC',
  logOnlineStatus: true
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

// @desc    Get always online settings
// @route   GET /api/always-online/settings
// @access  Private
exports.getAlwaysOnlineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get always online settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update always online settings
// @route   POST /api/always-online/settings
// @access  Private
exports.updateAlwaysOnlineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    user.alwaysOnlineSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Update always online settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set online status manually
// @route   POST /api/always-online/status
// @access  Private
exports.setOnlineStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { online, lastSeen } = req.body;

    const settings = mergeSettings(user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings);
    
    if (!settings.alwaysOnlineEnabled) {
      return res.status(403).json({ success: false, message: 'Always online is disabled' });
    }

    // Update user online status
    user.isOnline = online !== undefined ? online : true;
    
    if (settings.showLastSeen && lastSeen) {
      user.lastSeen = new Date(lastSeen);
    } else if (settings.customLastSeen) {
      user.lastSeen = new Date(settings.customLastSeen);
    } else if (!online) {
      user.lastSeen = new Date();
    }

    await user.save();

    // Emit socket event for real-time status update (mock)
    // io.emit('user-status-changed', { userId: user._id, isOnline: user.isOnline, lastSeen: user.lastSeen });

    res.status(200).json({ success: true, isOnline: user.isOnline, lastSeen: user.lastSeen });
  } catch (error) {
    console.error('Set online status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current online status
// @route   GET /api/always-online/status
// @access  Private
exports.getOnlineStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings);
    
    // Check if schedule is enabled and within schedule
    let shouldShowOnline = settings.alwaysOnlineEnabled && settings.showOnlineEvenWhenOffline;
    
    if (settings.scheduleEnabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      if (currentTime < settings.scheduleStart || currentTime > settings.scheduleEnd) {
        shouldShowOnline = false;
      }
    }

    const status = {
      isOnline: shouldShowOnline ? true : user.isOnline,
      lastSeen: settings.showLastSeen ? (user.lastSeen || new Date()) : null,
      hideTyping: settings.hideTyping,
      hideRecording: settings.hideRecording,
      customLastSeen: settings.customLastSeen
    };

    res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('Get online status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set custom last seen
// @route   POST /api/always-online/custom-last-seen
// @access  Private
exports.setCustomLastSeen = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { lastSeen } = req.body;

    if (!lastSeen) {
      return res.status(400).json({ success: false, message: 'Last seen date is required' });
    }

    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    existing.customLastSeen = new Date(lastSeen);
    user.alwaysOnlineSettings = mergeSettings({ ...existing });
    user.markModified('alwaysOnlineSettings');
    
    user.lastSeen = new Date(lastSeen);
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Set custom last seen error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear custom last seen
// @route   DELETE /api/always-online/custom-last-seen
// @access  Private
exports.clearCustomLastSeen = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    existing.customLastSeen = null;
    user.alwaysOnlineSettings = mergeSettings({ ...existing });
    user.markModified('alwaysOnlineSettings');
    
    user.lastSeen = new Date();
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Clear custom last seen error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to specific list
// @route   POST /api/always-online/conversation
// @access  Private
exports.addConversationToSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    if (!existing.specificConversations) existing.specificConversations = [];
    
    if (!existing.specificConversations.includes(conversationId)) {
      existing.specificConversations.push(conversationId);
    }

    user.alwaysOnlineSettings = mergeSettings({ ...existing });
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Add conversation to specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from specific list
// @route   DELETE /api/always-online/conversation/:conversationId
// @access  Private
exports.removeConversationFromSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    if (existing.specificConversations) {
      existing.specificConversations = existing.specificConversations.filter(id => id !== conversationId);
    }

    user.alwaysOnlineSettings = mergeSettings({ ...existing });
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Remove conversation from specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to exclude list
// @route   POST /api/always-online/exclude
// @access  Private
exports.addConversationToExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    if (!existing.excludeConversations) existing.excludeConversations = [];
    
    if (!existing.excludeConversations.includes(conversationId)) {
      existing.excludeConversations.push(conversationId);
    }

    user.alwaysOnlineSettings = mergeSettings({ ...existing });
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Add conversation to exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from exclude list
// @route   DELETE /api/always-online/exclude/:conversationId
// @access  Private
exports.removeConversationFromExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    if (existing.excludeConversations) {
      existing.excludeConversations = existing.excludeConversations.filter(id => id !== conversationId);
    }

    user.alwaysOnlineSettings = mergeSettings({ ...existing });
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Remove conversation from exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get online status log
// @route   GET /api/always-online/log
// @access  Private
exports.getOnlineStatusLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const log = user.onlineStatusLog || [];
    const { limit } = req.query;
    
    const logLimit = parseInt(limit) || 100;
    const recentLog = log.slice(-logLimit);

    res.status(200).json({ success: true, log: recentLog });
  } catch (error) {
    console.error('Get online status log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear online status log
// @route   DELETE /api/always-online/log
// @access  Private
exports.clearOnlineStatusLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.onlineStatusLog = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Online status log cleared' });
  } catch (error) {
    console.error('Clear online status log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle always online
// @route   POST /api/always-online/toggle
// @access  Private
exports.toggleAlwaysOnline = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.alwaysOnlineSettings?.toObject?.() || user.alwaysOnlineSettings || {};
    
    user.alwaysOnlineSettings = mergeSettings({
      ...existing,
      alwaysOnlineEnabled: enabled !== undefined ? enabled : !existing.alwaysOnlineEnabled
    });
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Toggle always online error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset always online settings to default
// @route   POST /api/always-online/reset
// @access  Private
exports.resetAlwaysOnlineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.alwaysOnlineSettings = mergeSettings({});
    user.markModified('alwaysOnlineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.alwaysOnlineSettings });
  } catch (error) {
    console.error('Reset always online settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
