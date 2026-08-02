const User = require('../models/User');
const Status = require('../models/Status');

const defaultSettings = {
  statusPrivacy: 'contacts', // everyone, contacts, nobody
  statusViewCount: true,
  statusMute: false,
  statusArchive: true,
  statusDelete: true,
  statusEdit: true,
  statusShare: true,
  statusDownload: true,
  statusForward: true,
  statusCaption: true,
  statusMentions: true,
  statusLinks: true,
  statusBackground: true,
  statusFont: true,
  statusColor: true,
  statusDuration: 24, // hours
  statusAutoDelete: false,
  statusViewReceipts: true,
  statusHideViewers: false,
  statusAllowReplies: true,
  statusAllowShares: true,
  statusCameraCapture: true,
  statusGallerySelection: true,
  statusMultiSelect: true,
  statusTextStatus: true,
  statusLinkStatus: true,
  statusGIFStatus: true,
  statusVoiceStatus: true,
  statusMusicStatus: true,
  statusPollStatus: true,
  statusQuizStatus: true,
  statusQuestionStatus: true,
  statusCountdownStatus: true,
  statusLocationStatus: true,
  statusCollageStatus: true,
  statusBoomerangStatus: true,
  statusReactionStatus: true,
  statusFullScreenViewer: true,
  statusTapToNextPrevious: true,
  statusSwipeToDismiss: true,
  statusHoldToPause: true,
  statusViewerList: true,
  statusScreenshotDetection: false,
  statusPasswordProtection: false,
  statusFingerprintProtection: false,
  statusViewOnce: false,
  statusDisappearingAfterView: false,
  statusPinProtection: false,
  statusAntiScreenshot: false,
  statusScheduling: true,
  statusHighlights: true,
  statusCloseFriends: false,
  maxStatusDuration: 30, // seconds for video
  maxStatusTextLength: 700,
  maxStatusImages: 10,
  maxStatusVideos: 1
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

// @desc    Get status features settings
// @route   GET /api/status-features/settings
// @access  Private
exports.getStatusFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get status features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update status features settings
// @route   POST /api/status-features/settings
// @access  Private
exports.updateStatusFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings || {};
    
    user.statusFeaturesSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('statusFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusFeaturesSettings });
  } catch (error) {
    console.error('Update status features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update status privacy
// @route   POST /api/status-features/privacy
// @access  Private
exports.updateStatusPrivacy = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { privacy } = req.body;
    if (!['everyone', 'contacts', 'nobody'].includes(privacy)) {
      return res.status(400).json({ success: false, message: 'Invalid privacy setting' });
    }

    const existing = user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings || {};
    user.statusFeaturesSettings = mergeSettings({
      ...existing,
      statusPrivacy: privacy
    });
    user.markModified('statusFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusFeaturesSettings });
  } catch (error) {
    console.error('Update status privacy error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle status highlights
// @route   POST /api/status-features/highlights
// @access  Private
exports.toggleStatusHighlights = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings || {};
    
    user.statusFeaturesSettings = mergeSettings({
      ...existing,
      statusHighlights: enabled !== undefined ? enabled : !existing.statusHighlights
    });
    user.markModified('statusFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusFeaturesSettings });
  } catch (error) {
    console.error('Toggle status highlights error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create status highlight
// @route   POST /api/status-features/highlight/create
// @access  Private
exports.createStatusHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, statusIds, coverImage } = req.body;

    if (!name || !statusIds || !Array.isArray(statusIds) || statusIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Name and status IDs are required' });
    }

    const highlight = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      statusIds,
      coverImage,
      createdBy: user._id,
      createdAt: new Date()
    };

    if (!user.statusHighlights) user.statusHighlights = [];
    user.statusHighlights.push(highlight);
    user.markModified('statusHighlights');
    await user.save();

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    console.error('Create status highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle status close friends
// @route   POST /api/status-features/close-friends
// @access  Private
exports.toggleStatusCloseFriends = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings || {};
    
    user.statusFeaturesSettings = mergeSettings({
      ...existing,
      statusCloseFriends: enabled !== undefined ? enabled : !existing.statusCloseFriends
    });
    user.markModified('statusFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusFeaturesSettings });
  } catch (error) {
    console.error('Toggle status close friends error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add user to close friends
// @route   POST /api/status-features/close-friends/add
// @access  Private
exports.addToCloseFriends = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { userId } = req.body;

    if (!user.closeFriends) user.closeFriends = [];
    if (!user.closeFriends.includes(userId)) {
      user.closeFriends.push(userId);
      user.markModified('closeFriends');
      await user.save();
    }

    res.status(200).json({ success: true, closeFriends: user.closeFriends });
  } catch (error) {
    console.error('Add to close friends error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove user from close friends
// @route   POST /api/status-features/close-friends/remove
// @access  Private
exports.removeFromCloseFriends = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { userId } = req.body;

    if (user.closeFriends) {
      user.closeFriends = user.closeFriends.filter(id => id !== userId);
      user.markModified('closeFriends');
      await user.save();
    }

    res.status(200).json({ success: true, closeFriends: user.closeFriends });
  } catch (error) {
    console.error('Remove from close friends error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get status viewers
// @route   GET /api/status-features/viewers/:statusId
// @access  Private
exports.getStatusViewers = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { statusId } = req.params;

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (status.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only view your own status viewers' });
    }

    const viewers = await User.find({
      _id: { $in: status.viewedBy }
    }).select('username profilePicture');

    res.status(200).json({ success: true, viewers });
  } catch (error) {
    console.error('Get status viewers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update status duration (hours) - extend beyond 24h
// @route   POST /api/status-features/duration
// @access  Private
exports.updateStatusDuration = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { hours } = req.body;
    const parsed = Number(hours);
    if (!Number.isFinite(parsed) || parsed < 24 || parsed > 168) {
      return res.status(400).json({ success: false, message: 'Duration must be between 24 and 168 hours' });
    }

    const existing = user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings || {};
    user.statusFeaturesSettings = mergeSettings({
      ...existing,
      statusDuration: parsed,
      maxStatusVideoDurationHours: parsed
    });
    user.markModified('statusFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, statusDuration: user.statusFeaturesSettings.statusDuration });
  } catch (error) {
    console.error('Update status duration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset status features settings to default
// @route   POST /api/status-features/reset
// @access  Private
exports.resetStatusFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.statusFeaturesSettings = mergeSettings({});
    user.markModified('statusFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.statusFeaturesSettings });
  } catch (error) {
    console.error('Reset status features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
