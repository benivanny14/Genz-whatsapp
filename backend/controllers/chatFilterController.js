const User = require('../models/User');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  chatFiltersEnabled: true,
  showFilterBadges: true,
  saveFilterPreferences: true,
  defaultFilters: {
    type: [],
    status: [],
    time: 'all'
  },
  maxSavedFilters: 10,
  autoApplyFilters: false
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

// @desc    Get chat filter settings
// @route   GET /api/chat-filter/settings
// @access  Private
exports.getChatFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatFilterSettings?.toObject?.() || user.chatFilterSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat filter settings
// @route   POST /api/chat-filter/settings
// @access  Private
exports.updateChatFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatFilterSettings?.toObject?.() || user.chatFilterSettings || {};
    
    user.chatFilterSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFilterSettings });
  } catch (error) {
    console.error('Update chat filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Filter conversations
// @route   POST /api/chat-filter/filter
// @access  Private
exports.filterConversations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { type, status, time } = req.body;

    const settings = mergeSettings(user.chatFilterSettings?.toObject?.() || user.chatFilterSettings);
    
    if (!settings.chatFiltersEnabled) {
      return res.status(403).json({ success: false, message: 'Chat filters are disabled' });
    }

    // Get all user conversations
    const conversations = await Conversation.find({
      participants: user._id
    }).populate('participants', 'username profilePicture');

    let filteredConversations = [...conversations];

    // Filter by type
    if (type && type.length > 0) {
      if (type.includes('contact')) {
        filteredConversations = filteredConversations.filter(c => !c.isGroup);
      }
      if (type.includes('group')) {
        filteredConversations = filteredConversations.filter(c => c.isGroup);
      }
    }

    // Filter by status
    if (status && status.length > 0) {
      if (status.includes('unread')) {
        filteredConversations = filteredConversations.filter(c => c.unreadCount > 0);
      }
      if (status.includes('muted')) {
        filteredConversations = filteredConversations.filter(c => c.isMuted);
      }
      if (status.includes('archived')) {
        filteredConversations = filteredConversations.filter(c => c.isArchived);
      }
      if (status.includes('pinned')) {
        filteredConversations = filteredConversations.filter(c => c.isPinned);
      }
    }

    // Filter by time
    if (time && time !== 'all') {
      const now = new Date();
      let timeThreshold;

      switch (time) {
        case 'today':
          timeThreshold = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          timeThreshold = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          timeThreshold = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          timeThreshold = null;
      }

      if (timeThreshold) {
        filteredConversations = filteredConversations.filter(c => 
          new Date(c.updatedAt) >= timeThreshold
        );
      }
    }

    res.status(200).json({ 
      success: true, 
      conversations: filteredConversations,
      filterCount: conversations.length - filteredConversations.length
    });
  } catch (error) {
    console.error('Filter conversations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save filter preferences
// @route   POST /api/chat-filter/save-preference
// @access  Private
exports.saveFilterPreference = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({ success: false, message: 'Name and filters are required' });
    }

    const settings = mergeSettings(user.chatFilterSettings?.toObject?.() || user.chatFilterSettings);
    
    if (!settings.saveFilterPreferences) {
      return res.status(403).json({ success: false, message: 'Saving filter preferences is disabled' });
    }

    if (!user.savedFilterPreferences) user.savedFilterPreferences = [];
    
    // Check max saved filters
    if (user.savedFilterPreferences.length >= settings.maxSavedFilters) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxSavedFilters} saved filters allowed` 
      });
    }

    const savedPreference = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      filters,
      createdAt: new Date()
    };

    user.savedFilterPreferences.push(savedPreference);
    await user.save();

    res.status(200).json({ success: true, savedPreference });
  } catch (error) {
    console.error('Save filter preference error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get saved filter preferences
// @route   GET /api/chat-filter/saved-preferences
// @access  Private
exports.getSavedFilterPreferences = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const preferences = user.savedFilterPreferences || [];
    res.status(200).json({ success: true, preferences });
  } catch (error) {
    console.error('Get saved filter preferences error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete saved filter preference
// @route   DELETE /api/chat-filter/saved-preferences/:id
// @access  Private
exports.deleteSavedFilterPreference = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const preferences = user.savedFilterPreferences || [];
    const index = preferences.findIndex(p => p._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Filter preference not found' });
    }

    preferences.splice(index, 1);
    user.savedFilterPreferences = preferences;
    await user.save();

    res.status(200).json({ success: true, message: 'Filter preference deleted' });
  } catch (error) {
    console.error('Delete saved filter preference error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Apply saved filter preference
// @route   POST /api/chat-filter/saved-preferences/:id/apply
// @access  Private
exports.applySavedFilterPreference = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const preferences = user.savedFilterPreferences || [];
    const preference = preferences.find(p => p._id.toString() === id);
    
    if (!preference) {
      return res.status(404).json({ success: false, message: 'Filter preference not found' });
    }

    // Apply the saved filters
    const { type, status, time } = preference.filters;
    
    // Get filtered conversations
    const conversations = await Conversation.find({
      participants: user._id
    }).populate('participants', 'username profilePicture');

    let filteredConversations = [...conversations];

    // Apply same filtering logic as filterConversations
    if (type && type.length > 0) {
      if (type.includes('contact')) {
        filteredConversations = filteredConversations.filter(c => !c.isGroup);
      }
      if (type.includes('group')) {
        filteredConversations = filteredConversations.filter(c => c.isGroup);
      }
    }

    if (status && status.length > 0) {
      if (status.includes('unread')) {
        filteredConversations = filteredConversations.filter(c => c.unreadCount > 0);
      }
      if (status.includes('muted')) {
        filteredConversations = filteredConversations.filter(c => c.isMuted);
      }
      if (status.includes('archived')) {
        filteredConversations = filteredConversations.filter(c => c.isArchived);
      }
      if (status.includes('pinned')) {
        filteredConversations = filteredConversations.filter(c => c.isPinned);
      }
    }

    if (time && time !== 'all') {
      const now = new Date();
      let timeThreshold;

      switch (time) {
        case 'today':
          timeThreshold = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          timeThreshold = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          timeThreshold = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          timeThreshold = null;
      }

      if (timeThreshold) {
        filteredConversations = filteredConversations.filter(c => 
          new Date(c.updatedAt) >= timeThreshold
        );
      }
    }

    res.status(200).json({ 
      success: true, 
      conversations: filteredConversations,
      filters: preference.filters
    });
  } catch (error) {
    console.error('Apply saved filter preference error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle chat filter
// @route   POST /api/chat-filter/toggle
// @access  Private
exports.toggleChatFilter = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatFilterSettings?.toObject?.() || user.chatFilterSettings || {};
    
    user.chatFilterSettings = mergeSettings({
      ...existing,
      chatFiltersEnabled: enabled !== undefined ? enabled : !existing.chatFiltersEnabled
    });
    user.markModified('chatFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFilterSettings });
  } catch (error) {
    console.error('Toggle chat filter error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset chat filter settings to default
// @route   POST /api/chat-filter/reset
// @access  Private
exports.resetChatFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatFilterSettings = mergeSettings({});
    user.markModified('chatFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFilterSettings });
  } catch (error) {
    console.error('Reset chat filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
