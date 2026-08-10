/**
 * chatOrganizationController.js
 * ------------------------------
 * Consolidated controller for chat FILTER + chat SORT (proof-of-concept
 * refactor of chatFilterController.js + chatSortController.js).
 *
 * The two original controllers duplicated the same scaffolding: getUser(),
 * mergeSettings(), settings get/update handlers, toggle/reset handlers, and
 * the conversation query. This file keeps every exported handler name and
 * route path intact (see REFACTOR_PLAN.md) — only the internal wiring is
 * shared now.
 *
 *   POST /api/chat-filter/...  →  filter* handlers below
 *   POST /api/chat-sort/...    →  sort* handlers below
 */


const Conversation = require('../models/Conversation');
const { getUser, mergeSettings, createSettingsMerger } = require('../services/userScopedService');

// ── Shared helpers (previously duplicated across both controllers) ──────────



const getUserConversations = async (userId) =>
  Conversation.find({ participants: userId }).populate('participants', 'username profilePicture');

// Filtering logic shared by filterConversations and applySavedFilterPreference.
const applyChatFilters = (conversations, { type, status, time } = {}) => {
  let filtered = [...conversations];

  if (type && type.length > 0) {
    if (type.includes('contact')) filtered = filtered.filter((c) => !c.isGroup);
    if (type.includes('group')) filtered = filtered.filter((c) => c.isGroup);
  }

  if (status && status.length > 0) {
    if (status.includes('unread')) filtered = filtered.filter((c) => c.unreadCount > 0);
    if (status.includes('muted')) filtered = filtered.filter((c) => c.isMuted);
    if (status.includes('archived')) filtered = filtered.filter((c) => c.isArchived);
    if (status.includes('pinned')) filtered = filtered.filter((c) => c.isPinned);
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
      filtered = filtered.filter((c) => new Date(c.updatedAt) >= timeThreshold);
    }
  }

  return filtered;
};

// Sorting logic shared by sortConversations, getCustomSortOrder.
const applyChatSort = (conversations, sortMethod, isAscending, settings = {}) => {
  let sorted = [...conversations];

  const compareBy = (pick) => (a, b) => {
    const va = pick(a);
    const vb = pick(b);
    return isAscending ? va - vb : vb - va;
  };

  switch (sortMethod) {
    case 'alphabetical':
      sorted.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return isAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
      break;
    case 'unread':
      sorted.sort(compareBy((c) => c.unreadCount || 0));
      break;
    case 'pinned':
      sorted.sort(compareBy((c) => (c.isPinned ? 1 : 0)));
      break;
    case 'archived':
      sorted.sort(compareBy((c) => (c.isArchived ? 1 : 0)));
      break;
    case 'recent':
    default:
      sorted.sort((a, b) => {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        return isAscending ? dateA - dateB : dateB - dateA;
      });
  }

  if (settings.groupPinnedFirst && sortMethod !== 'pinned') {
    sorted = [...sorted.filter((c) => c.isPinned), ...sorted.filter((c) => !c.isPinned)];
  }
  if (settings.groupUnreadFirst && sortMethod !== 'unread') {
    sorted = [...sorted.filter((c) => c.unreadCount > 0), ...sorted.filter((c) => c.unreadCount === 0)];
  }

  return sorted;
};

// ── Chat FILTER handlers (route prefix /api/chat-filter) ────────────────────

const FILTER_DEFAULTS = {
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

exports.getChatFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(FILTER_DEFAULTS, user.chatFilterSettings?.toObject?.() || user.chatFilterSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateChatFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatFilterSettings?.toObject?.() || user.chatFilterSettings || {};

    user.chatFilterSettings = mergeSettings(FILTER_DEFAULTS, { ...existing, ...incoming });
    user.markModified('chatFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFilterSettings });
  } catch (error) {
    console.error('Update chat filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.filterConversations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { type, status, time } = req.body;
    const settings = mergeSettings(FILTER_DEFAULTS, user.chatFilterSettings?.toObject?.() || user.chatFilterSettings);

    if (!settings.chatFiltersEnabled) {
      return res.status(403).json({ success: false, message: 'Chat filters are disabled' });
    }

    const conversations = await getUserConversations(user._id);
    const filteredConversations = applyChatFilters(conversations, { type, status, time });

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

exports.saveFilterPreference = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, filters } = req.body;
    if (!name || !filters) {
      return res.status(400).json({ success: false, message: 'Name and filters are required' });
    }

    const settings = mergeSettings(FILTER_DEFAULTS, user.chatFilterSettings?.toObject?.() || user.chatFilterSettings);
    if (!settings.saveFilterPreferences) {
      return res.status(403).json({ success: false, message: 'Saving filter preferences is disabled' });
    }

    if (!user.savedFilterPreferences) user.savedFilterPreferences = [];
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
    user.markModified('savedFilterPreferences');
    await user.save();

    res.status(200).json({ success: true, savedPreference });
  } catch (error) {
    console.error('Save filter preference error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSavedFilterPreferences = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    res.status(200).json({ success: true, preferences: user.savedFilterPreferences || [] });
  } catch (error) {
    console.error('Get saved filter preferences error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSavedFilterPreference = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const preferences = user.savedFilterPreferences || [];
    const index = preferences.findIndex((p) => p._id.toString() === id);

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

exports.applySavedFilterPreference = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const preferences = user.savedFilterPreferences || [];
    const preference = preferences.find((p) => p._id.toString() === id);

    if (!preference) {
      return res.status(404).json({ success: false, message: 'Filter preference not found' });
    }

    const conversations = await getUserConversations(user._id);
    const filteredConversations = applyChatFilters(conversations, preference.filters);

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

exports.toggleChatFilter = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatFilterSettings?.toObject?.() || user.chatFilterSettings || {};

    user.chatFilterSettings = mergeSettings(FILTER_DEFAULTS, {
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

exports.resetChatFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatFilterSettings = mergeSettings(FILTER_DEFAULTS, {});
    user.markModified('chatFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFilterSettings });
  } catch (error) {
    console.error('Reset chat filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Chat SORT handlers (route prefix /api/chat-sort) ────────────────────────

const SORT_DEFAULTS = {
  chatSortEnabled: true,
  defaultSort: 'recent',
  ascending: false,
  saveSortPreference: true,
  groupPinnedFirst: true,
  groupUnreadFirst: false,
  customSortOrder: []
};

exports.getChatSortSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(SORT_DEFAULTS, user.chatSortSettings?.toObject?.() || user.chatSortSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat sort settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateChatSortSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatSortSettings?.toObject?.() || user.chatSortSettings || {};

    user.chatSortSettings = mergeSettings(SORT_DEFAULTS, { ...existing, ...incoming });
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Update chat sort settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sortConversations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { sortBy, ascending } = req.body;
    const settings = mergeSettings(SORT_DEFAULTS, user.chatSortSettings?.toObject?.() || user.chatSortSettings);

    if (!settings.chatSortEnabled) {
      return res.status(403).json({ success: false, message: 'Chat sort is disabled' });
    }

    const sortMethod = sortBy || settings.defaultSort;
    const isAscending = ascending !== undefined ? ascending : settings.ascending;

    const conversations = await getUserConversations(user._id);
    const sortedConversations = applyChatSort(conversations, sortMethod, isAscending, settings);

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

exports.saveCustomSortOrder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationIds } = req.body;
    if (!conversationIds || !Array.isArray(conversationIds)) {
      return res.status(400).json({ success: false, message: 'Conversation IDs array is required' });
    }

    const settings = mergeSettings(SORT_DEFAULTS, user.chatSortSettings?.toObject?.() || user.chatSortSettings);
    if (!settings.saveSortPreference) {
      return res.status(403).json({ success: false, message: 'Saving sort preference is disabled' });
    }

    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: user._id
    });

    if (conversations.length !== conversationIds.length) {
      return res.status(400).json({ success: false, message: 'Some conversations not found or not accessible' });
    }

    user.chatSortSettings = mergeSettings(SORT_DEFAULTS, {
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

exports.getCustomSortOrder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(SORT_DEFAULTS, user.chatSortSettings?.toObject?.() || user.chatSortSettings);

    if (settings.customSortOrder && settings.customSortOrder.length > 0) {
      const conversations = await Conversation.find({
        _id: { $in: settings.customSortOrder },
        participants: user._id
      }).populate('participants', 'username profilePicture');

      const sortedConversations = settings.customSortOrder
        .map((id) => conversations.find((c) => c._id.toString() === id))
        .filter((c) => c !== undefined);

      res.status(200).json({ success: true, conversations: sortedConversations });
    } else {
      res.status(200).json({ success: true, conversations: [] });
    }
  } catch (error) {
    console.error('Get custom sort order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.clearCustomSortOrder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatSortSettings?.toObject?.() || user.chatSortSettings || {};

    user.chatSortSettings = mergeSettings(SORT_DEFAULTS, {
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

exports.toggleChatSort = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatSortSettings?.toObject?.() || user.chatSortSettings || {};

    user.chatSortSettings = mergeSettings(SORT_DEFAULTS, {
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

exports.resetChatSortSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatSortSettings = mergeSettings(SORT_DEFAULTS, {});
    user.markModified('chatSortSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSortSettings });
  } catch (error) {
    console.error('Reset chat sort settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

