/**
 * statusToolsController.js
 * ------------------------
 * Consolidated controller for status features + story highlights
 * (REFACTOR_PLAN.md step 6 — merges statusFeaturesController.js +
 * storyHighlightsController.js).
 *
 * Every exported handler name and route path stays intact; the shared
 * toggle handlers now use one generic createToggleHandler.
 *
 *   /api/status-features/... →  settings + privacy/viewers/highlights handlers
 *   /api/story-highlights/... → settings + story highlight CRUD handlers
 */

const User = require('../models/User');
const Status = require('../models/Status');
const Message = require('../models/Message');
const {
  getUser,
  createSettingsMerger,
  createSettingsHandlers,
  createToggleHandler
} = require('../services/userScopedService');

// ── Status features (route prefix /api/status-features) ─────────────────────

const STATUS_FEATURES_DEFAULTS = {
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

const mergeStatusFeaturesSettings = createSettingsMerger(STATUS_FEATURES_DEFAULTS);

// @desc    Get status features settings
// @route   GET /api/status-features/settings
// @access  Private
const {
  getSettings: getStatusFeaturesSettings,
  updateSettings: updateStatusFeaturesSettings,
  resetSettings: resetStatusFeaturesSettings
} = createSettingsHandlers({
  field: 'statusFeaturesSettings',
  label: 'status features',
  mergeSettings: mergeStatusFeaturesSettings,
});

exports.getStatusFeaturesSettings = getStatusFeaturesSettings;

// @desc    Update status features settings
// @route   POST /api/status-features/settings
// @access  Private
exports.updateStatusFeaturesSettings = updateStatusFeaturesSettings;

// @desc    Update status privacy
// @route   POST /api/status-features/privacy
// @access  Private
exports.updateStatusPrivacy = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { privacy } = req.body;
    // 'everyone' is deliberately no longer accepted (WhatsApp parity).
    if (!['contacts', 'nobody'].includes(privacy)) {
      return res.status(400).json({ success: false, message: 'Invalid privacy setting' });
    }

    const existing = user.statusFeaturesSettings?.toObject?.() || user.statusFeaturesSettings || {};
    user.statusFeaturesSettings = mergeStatusFeaturesSettings({
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

const toggleStatusFeatureField = createToggleHandler({
  settingsField: 'statusFeaturesSettings',
  merge: mergeStatusFeaturesSettings,
  acceptEnabled: true,
});

// @desc    Toggle status highlights
// @route   POST /api/status-features/highlights
// @access  Private
exports.toggleStatusHighlights = (req, res) => toggleStatusFeatureField(req, res, 'statusHighlights', 'Toggle status highlights');

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
exports.toggleStatusCloseFriends = (req, res) => toggleStatusFeatureField(req, res, 'statusCloseFriends', 'Toggle status close friends');

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
    user.statusFeaturesSettings = mergeStatusFeaturesSettings({
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
exports.resetStatusFeaturesSettings = resetStatusFeaturesSettings;

// ── Story highlights (route prefix /api/story-highlights) ───────────────────

const STORY_HIGHLIGHTS_DEFAULTS = {
  storyHighlightsEnabled: true,
  maxHighlights: 50,
  autoArchive: false,
  archiveAfterDays: 30,
  allowSharing: true,
  showOnProfile: true,
  highlightPrivacy: 'everyone', // everyone, contacts, nobody
  highlightCategories: []
};

const mergeStoryHighlightsSettings = createSettingsMerger(STORY_HIGHLIGHTS_DEFAULTS);

// @desc    Get story highlights settings
// @route   GET /api/story-highlights/settings
// @access  Private
const {
  getSettings: getStoryHighlightsSettings,
  updateSettings: updateStoryHighlightsSettings,
  resetSettings: resetStoryHighlightsSettings
} = createSettingsHandlers({
  field: 'storyHighlightsSettings',
  label: 'story highlights',
  mergeSettings: mergeStoryHighlightsSettings,
});

exports.getStoryHighlightsSettings = getStoryHighlightsSettings;

// @desc    Update story highlights settings
// @route   POST /api/story-highlights/settings
// @access  Private
exports.updateStoryHighlightsSettings = updateStoryHighlightsSettings;

// @desc    Create story highlight
// @route   POST /api/story-highlights/create
// @access  Private
exports.createStoryHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { title, statusIds, coverImage, category } = req.body;

    if (!title || !statusIds || !Array.isArray(statusIds)) {
      return res.status(400).json({ success: false, message: 'Title and status IDs are required' });
    }

    const settings = mergeStoryHighlightsSettings(user.storyHighlightsSettings?.toObject?.() || user.storyHighlightsSettings);

    if (!settings.storyHighlightsEnabled) {
      return res.status(403).json({ success: false, message: 'Story highlights are disabled' });
    }

    const existingHighlights = user.storyHighlights || [];
    if (existingHighlights.length >= settings.maxHighlights) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${settings.maxHighlights} highlights allowed`
      });
    }

    const highlight = {
      _id: new (require('mongoose').Types.ObjectId)(),
      title,
      statusIds,
      coverImage: coverImage || null,
      category: category || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.storyHighlights) user.storyHighlights = [];
    user.storyHighlights.push(highlight);
    user.markModified('storyHighlights');
    await user.save();

    res.status(200).json({ success: true, highlight });
  } catch (error) {
    console.error('Create story highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all story highlights
// @route   GET /api/story-highlights
// @access  Private
exports.getStoryHighlights = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const highlights = user.storyHighlights || [];
    res.status(200).json({ success: true, highlights });
  } catch (error) {
    console.error('Get story highlights error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single story highlight
// @route   GET /api/story-highlights/:id
// @access  Private
exports.getStoryHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const highlight = (user.storyHighlights || []).find(h => h._id.toString() === id);
    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    // Get the actual status messages
    const statusMessages = await Message.find({
      _id: { $in: highlight.statusIds }
    }).populate('sender', 'username profilePicture');

    res.status(200).json({ success: true, highlight, statusMessages });
  } catch (error) {
    console.error('Get story highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update story highlight
// @route   POST /api/story-highlights/:id
// @access  Private
exports.updateStoryHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { title, coverImage, category, statusIds } = req.body;

    const highlights = user.storyHighlights || [];
    const index = highlights.findIndex(h => h._id.toString() === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlights[index].title = title || highlights[index].title;
    highlights[index].coverImage = coverImage !== undefined ? coverImage : highlights[index].coverImage;
    highlights[index].category = category !== undefined ? category : highlights[index].category;
    highlights[index].statusIds = statusIds || highlights[index].statusIds;
    highlights[index].updatedAt = new Date();

    user.storyHighlights = highlights;
    user.markModified('storyHighlights');
    await user.save();

    res.status(200).json({ success: true, highlight: highlights[index] });
  } catch (error) {
    console.error('Update story highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete story highlight
// @route   DELETE /api/story-highlights/:id
// @access  Private
exports.deleteStoryHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const highlights = user.storyHighlights || [];
    const index = highlights.findIndex(h => h._id.toString() === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlights.splice(index, 1);
    user.storyHighlights = highlights;
    user.markModified('storyHighlights');
    await user.save();

    res.status(200).json({ success: true, message: 'Highlight deleted' });
  } catch (error) {
    console.error('Delete story highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add status to highlight
// @route   POST /api/story-highlights/:highlightId/status
// @access  Private
exports.addStatusToHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { highlightId } = req.params;
    const { statusId } = req.body;

    if (!statusId) {
      return res.status(400).json({ success: false, message: 'Status ID is required' });
    }

    const highlights = user.storyHighlights || [];
    const index = highlights.findIndex(h => h._id.toString() === highlightId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    if (!highlights[index].statusIds.includes(statusId)) {
      highlights[index].statusIds.push(statusId);
      highlights[index].updatedAt = new Date();
    }

    user.storyHighlights = highlights;
    user.markModified('storyHighlights');
    await user.save();

    res.status(200).json({ success: true, highlight: highlights[index] });
  } catch (error) {
    console.error('Add status to highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove status from highlight
// @route   DELETE /api/story-highlights/:highlightId/status/:statusId
// @access  Private
exports.removeStatusFromHighlight = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { highlightId, statusId } = req.params;

    const highlights = user.storyHighlights || [];
    const index = highlights.findIndex(h => h._id.toString() === highlightId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlights[index].statusIds = highlights[index].statusIds.filter(id => id.toString() !== statusId);
    highlights[index].updatedAt = new Date();

    user.storyHighlights = highlights;
    user.markModified('storyHighlights');
    await user.save();

    res.status(200).json({ success: true, highlight: highlights[index] });
  } catch (error) {
    console.error('Remove status from highlight error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleStoryHighlightsField = createToggleHandler({
  settingsField: 'storyHighlightsSettings',
  merge: mergeStoryHighlightsSettings,
  acceptEnabled: true,
});

// @desc    Toggle story highlights
// @route   POST /api/story-highlights/toggle
// @access  Private
exports.toggleStoryHighlights = (req, res) => toggleStoryHighlightsField(req, res, 'storyHighlightsEnabled', 'Toggle story highlights');

// @desc    Reset story highlights settings to default
// @route   POST /api/story-highlights/reset
// @access  Private
exports.resetStoryHighlightsSettings = resetStoryHighlightsSettings;
