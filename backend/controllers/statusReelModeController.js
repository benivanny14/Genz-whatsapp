const User = require('../models/User');
const Message = require('../models/Message');

const defaultSettings = {
  statusReelModeEnabled: true,
  autoPlay: true,
  fullScreen: true,
  swipeNavigation: true,
  soundEnabled: true,
  showCaptions: true,
  showReactions: true,
  showComments: false,
  loopPlayback: false,
  playbackSpeed: 1.0,
  quality: 'auto', // auto, high, medium, low
  dataSaver: false,
  hideViewed: false,
  showProgress: true,
  gestureControls: true
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

// @desc    Get status reel mode settings
// @route   GET /api/status-reel-mode/settings
// @access  Private
exports.getStatusReelModeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.statusReelModeSettings?.toObject?.() || user.statusReelModeSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get status reel mode settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update status reel mode settings
// @route   POST /api/status-reel-mode/settings
// @access  Private
exports.updateStatusReelModeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.statusReelModeSettings?.toObject?.() || user.statusReelModeSettings || {};
    
    user.statusReelModeSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('statusReelModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusReelModeSettings });
  } catch (error) {
    console.error('Update status reel mode settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get statuses in reel mode
// @route   GET /api/status-reel-mode/statuses
// @access  Private
exports.getStatusesInReelMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.statusReelModeSettings?.toObject?.() || user.statusReelModeSettings);
    
    if (!settings.statusReelModeEnabled) {
      return res.status(403).json({ success: false, message: 'Status reel mode is disabled' });
    }

    // Get user's contacts
    const contacts = user.contacts || [];
    const contactIds = contacts.map(c => c.userId);

    // Get recent status messages from contacts
    const statuses = await Message.find({
      sender: { $in: contactIds },
      messageType: 'status',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .populate('sender', 'username profilePicture')
    .sort({ createdAt: -1 })
    .limit(50);

    // Filter viewed statuses if setting is enabled
    let filteredStatuses = statuses;
    if (settings.hideViewed) {
      const viewedStatusIds = user.viewedStatuses || [];
      filteredStatuses = statuses.filter(s => !viewedStatusIds.includes(s._id.toString()));
    }

    res.status(200).json({ 
      success: true, 
      statuses: filteredStatuses,
      settings: {
        autoPlay: settings.autoPlay,
        fullScreen: settings.fullScreen,
        soundEnabled: settings.soundEnabled,
        showCaptions: settings.showCaptions,
        showReactions: settings.showReactions,
        showComments: settings.showComments,
        loopPlayback: settings.loopPlayback,
        playbackSpeed: settings.playbackSpeed,
        quality: settings.quality,
        dataSaver: settings.dataSaver,
        showProgress: settings.showProgress,
        gestureControls: settings.gestureControls
      }
    });
  } catch (error) {
    console.error('Get statuses in reel mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark status as viewed
// @route   POST /api/status-reel-mode/status/:statusId/viewed
// @access  Private
exports.markStatusAsViewed = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.params;

    const status = await Message.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (!user.viewedStatuses) user.viewedStatuses = [];
    
    if (!user.viewedStatuses.includes(statusId)) {
      user.viewedStatuses.push(statusId);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Status marked as viewed' });
  } catch (error) {
    console.error('Mark status as viewed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    React to status in reel mode
// @route   POST /api/status-reel-mode/status/:statusId/react
// @access  Private
exports.reactToStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const status = await Message.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (!status.reactions) status.reactions = [];
    
    // Check if user already reacted
    const existingReaction = status.reactions.find(r => r.userId.toString() === user._id.toString());
    if (existingReaction) {
      existingReaction.emoji = emoji;
      existingReaction.timestamp = new Date();
    } else {
      status.reactions.push({
        userId: user._id,
        username: user.username,
        emoji,
        timestamp: new Date()
      });
    }

    await status.save();

    // Emit socket event for real-time reaction (mock)
    // io.to(status.sender.toString()).emit('status-reaction', { statusId, reaction });

    res.status(200).json({ success: true, reaction: status.reactions });
  } catch (error) {
    console.error('React to status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get status reactions
// @route   GET /api/status-reel-mode/status/:statusId/reactions
// @access  Private
exports.getStatusReactions = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.params;

    const status = await Message.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    res.status(200).json({ success: true, reactions: status.reactions || [] });
  } catch (error) {
    console.error('Get status reactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Comment on status in reel mode
// @route   POST /api/status-reel-mode/status/:statusId/comment
// @access  Private
exports.commentOnStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const status = await Message.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (!status.comments) status.comments = [];
    
    status.comments.push({
      userId: user._id,
      username: user.username,
      text,
      timestamp: new Date()
    });

    await status.save();

    // Emit socket event for real-time comment (mock)
    // io.to(status.sender.toString()).emit('status-comment', { statusId, comment });

    res.status(200).json({ success: true, comment: status.comments[status.comments.length - 1] });
  } catch (error) {
    console.error('Comment on status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get status comments
// @route   GET /api/status-reel-mode/status/:statusId/comments
// @access  Private
exports.getStatusComments = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.params;

    const status = await Message.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    res.status(200).json({ success: true, comments: status.comments || [] });
  } catch (error) {
    console.error('Get status comments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear viewed statuses
// @route   DELETE /api/status-reel-mode/viewed
// @access  Private
exports.clearViewedStatuses = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.viewedStatuses = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Viewed statuses cleared' });
  } catch (error) {
    console.error('Clear viewed statuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle status reel mode
// @route   POST /api/status-reel-mode/toggle
// @access  Private
exports.toggleStatusReelMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.statusReelModeSettings?.toObject?.() || user.statusReelModeSettings || {};
    
    user.statusReelModeSettings = mergeSettings({
      ...existing,
      statusReelModeEnabled: enabled !== undefined ? enabled : !existing.statusReelModeEnabled
    });
    user.markModified('statusReelModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusReelModeSettings });
  } catch (error) {
    console.error('Toggle status reel mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset status reel mode settings to default
// @route   POST /api/status-reel-mode/reset
// @access  Private
exports.resetStatusReelModeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.statusReelModeSettings = mergeSettings({});
    user.markModified('statusReelModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusReelModeSettings });
  } catch (error) {
    console.error('Reset status reel mode settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
