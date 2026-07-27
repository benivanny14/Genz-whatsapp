const User = require('../models/User');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  chatSortEnabled: true,
  defaultSort: 'recent', // recent, alphabetical, unread, pinned, archived
  ascending: false,
  saveSortPreference: true,
  groupPinnedFirst: true,
  groupUnreadFirst: false,
  customSortOrder: []
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

// @desc    Get chat sort settings
// @route   GET /api/chat-sort/settings
// @access  Private
exports.getChatSortSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatSortSettings?.toObject?.() || user.chatSortSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat sort settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat sort settings
// @route   POST /api/chat-sort/settings
// @access  Private
exports.updateChatSortSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatSortSettings?.toObject?.() || user.chatSortSettings || {};
    
    user.chatSortSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Update chat sort settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sort conversations
// @route   POST /api/chat-sort/sort
// @access  Private
exports.sortConversations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { sortBy, ascending } = req.body;

    const settings = mergeSettings(user.chatSortSettings?.toObject?.() || user.chatSortSettings);
    
    if (!settings.chatSortEnabled) {
      return res.status(403).json({ success: false, message: 'Chat sort is disabled' });
    }

    const sortMethod = sortBy || settings.defaultSort;
    const isAscending = ascending !== undefined ? ascending : settings.ascending;

    // Get all user conversations
    const conversations = await Conversation.find({
      participants: user._id
    }).populate('participants', 'username profilePicture');

    let sortedConversations = [...conversations];

    // Apply sorting
    switch (sortMethod) {
      case 'recent':
        sortedConversations.sort((a, b) => {
          const dateA = new Date(a.updatedAt);
          const dateB = new Date(b.updatedAt);
          return isAscending ? dateA - dateB : dateB - dateA;
        });
        break;

      case 'alphabetical':
        sortedConversations.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return isAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        break;

      case 'unread':
        sortedConversations.sort((a, b) => {
          const unreadA = a.unreadCount || 0;
          const unreadB = b.unreadCount || 0;
          return isAscending ? unreadA - unreadB : unreadB - unreadA;
        });
        break;

      case 'pinned':
        sortedConversations.sort((a, b) => {
          const pinnedA = a.isPinned ? 1 : 0;
          const pinnedB = b.isPinned ? 1 : 0;
          return isAscending ? pinnedA - pinnedB : pinnedB - pinnedA;
        });
        break;

      case 'archived':
        sortedConversations.sort((a, b) => {
          const archivedA = a.isArchived ? 1 : 0;
          const archivedB = b.isArchived ? 1 : 0;
          return isAscending ? archivedA - archivedB : archivedA - archivedB;
        });
        break;

      default:
        // Default to recent
        sortedConversations.sort((a, b) => {
          const dateA = new Date(a.updatedAt);
          const dateB = new Date(b.updatedAt);
          return isAscending ? dateA - dateB : dateB - dateA;
        });
    }

    // Group pinned first if enabled
    if (settings.groupPinnedFirst && sortMethod !== 'pinned') {
      const pinned = sortedConversations.filter(c => c.isPinned);
      const unpinned = sortedConversations.filter(c => !c.isPinned);
      sortedConversations = [...pinned, ...unpinned];
    }

    // Group unread first if enabled
    if (settings.groupUnreadFirst && sortMethod !== 'unread') {
      const unread = sortedConversations.filter(c => c.unreadCount > 0);
      const read = sortedConversations.filter(c => c.unreadCount === 0);
      sortedConversations = [...unread, ...read];
    }

    res.status(200).json({ 
      success: true, 
      conversations: sortedConversations,
      sortBy: sortMethod,
      ascending: isAscending
    });
  } catch (error) {
    console.error('Sort conversations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save custom sort order
// @route   POST /api/chat-sort/custom-order
// @access  Private
exports.saveCustomSortOrder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({ success: false, message: 'Conversation IDs array is required' });
    }

    const settings = mergeSettings(user.chatSortSettings?.toObject?.() || user.chatSortSettings);
    
    if (!settings.saveSortPreference) {
      return res.status(403).json({ success: false, message: 'Saving sort preference is disabled' });
    }

    // Verify all conversations belong to user
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: user._id
    });

    if (conversations.length !== conversationIds.length) {
      return res.status(400).json({ success: false, message: 'Some conversations not found or not accessible' });
    }

    user.chatSortSettings = mergeSettings({
      ...settings,
      customSortOrder: conversationIds,
      defaultSort: 'custom'
    });
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Save custom sort order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get custom sort order
// @route   GET /api/chat-sort/custom-order
// @access  Private
exports.getCustomSortOrder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatSortSettings?.toObject?.() || user.chatSortSettings);
    
    if (settings.customSortOrder && settings.customSortOrder.length > 0) {
      const conversations = await Conversation.find({
        _id: { $in: settings.customSortOrder },
        participants: user._id
      }).populate('participants', 'username profilePicture');

      // Sort according to custom order
      const sortedConversations = settings.customSortOrder
        .map(id => conversations.find(c => c._id.toString() === id))
        .filter(c => c !== undefined);

      res.status(200).json({ success: true, conversations: sortedConversations });
    } else {
      res.status(200).json({ success: true, conversations: [] });
    }
  } catch (error) {
    console.error('Get custom sort order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear custom sort order
// @route   DELETE /api/chat-sort/custom-order
// @access  Private
exports.clearCustomSortOrder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatSortSettings?.toObject?.() || user.chatSortSettings || {};
    
    user.chatSortSettings = mergeSettings({
      ...existing,
      customSortOrder: [],
      defaultSort: 'recent'
    });
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Clear custom sort order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle chat sort
// @route   POST /api/chat-sort/toggle
// @access  Private
exports.toggleChatSort = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatSortSettings?.toObject?.() || user.chatSortSettings || {};
    
    user.chatSortSettings = mergeSettings({
      ...existing,
      chatSortEnabled: enabled !== undefined ? enabled : !existing.chatSortEnabled
    });
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Toggle chat sort error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset chat sort settings to default
// @route   POST /api/chat-sort/reset
// @access  Private
exports.resetChatSortSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatSortSettings = mergeSettings({});
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Reset chat sort settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
