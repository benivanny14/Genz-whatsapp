
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

const defaultSettings = {
  storyHighlightsEnabled: true,
  maxHighlights: 50,
  autoArchive: false,
  archiveAfterDays: 30,
  allowSharing: true,
  showOnProfile: true,
  highlightPrivacy: 'everyone', // everyone, contacts, nobody
  highlightCategories: []
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get story highlights settings
// @route   GET /api/story-highlights/settings
// @access  Private
const { getSettings: getStoryHighlightsSettings, updateSettings: updateStoryHighlightsSettings, resetSettings: resetStoryHighlightsSettings } = createSettingsHandlers({
  field: 'storyHighlightsSettings',
  label: 'story highlights',
  mergeSettings,
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

    const settings = mergeSettings(user.storyHighlightsSettings?.toObject?.() || user.storyHighlightsSettings);
    
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

// @desc    Toggle story highlights
// @route   POST /api/story-highlights/toggle
// @access  Private
exports.toggleStoryHighlights = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.storyHighlightsSettings?.toObject?.() || user.storyHighlightsSettings || {};
    
    user.storyHighlightsSettings = mergeSettings({
      ...existing,
      storyHighlightsEnabled: enabled !== undefined ? enabled : !existing.storyHighlightsEnabled
    });
    user.markModified('storyHighlightsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.storyHighlightsSettings });
  } catch (error) {
    console.error('Toggle story highlights error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset story highlights settings to default
// @route   POST /api/story-highlights/reset
// @access  Private
exports.resetStoryHighlightsSettings = resetStoryHighlightsSettings;

