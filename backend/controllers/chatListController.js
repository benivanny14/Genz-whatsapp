/**
 * chatListController.js
 * ---------------------
 * Consolidated controller for chat list MODs + chat search + chat folders
 * (step 1 of REFACTOR_PLAN.md — merges chatListModsController.js +
 * chatSearchController.js + chatFoldersController.js).
 *
 * The three original controllers duplicated the same scaffolding:
 * getUser(), mergeSettings(), settings get/update handlers, and the
 * conversation query. This file keeps every exported handler name and
 * route path intact — only the internal wiring is shared now.
 *
 *   /api/chat-list-mods/...  →  getChatListModsSettings, updateChatListModsSettings, toggle*
 *   /api/chat-search/...     →  getChatSearchSettings, search*, history handlers, ...
 *   /api/chat-folders/...    →  getChatFoldersSettings, folder CRUD, ...
 */


const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, mergeSettings, createSettingsHandlers, createToggleHandler } = require('../services/userScopedService');

// ── Shared helpers (previously duplicated across all three controllers) ─────



// ── Chat list MODs (route prefix /api/chat-list-mods) ───────────────────────

const LIST_MODS_DEFAULTS = {
  hideChatsEnabled: false,
  lockChatsEnabled: false,
  pinUnlimitedChats: false,
  markUnreadEnabled: false,
  archiveUnlimited: false,
  chatBackupEnabled: false,
  chatRestoreEnabled: false,
  chatExportEnabled: false
};

// Generic single-field toggle — every chat-list-mods toggle is identical
// apart from the field name and log label.
const toggleListModsField = createToggleHandler({
  settingsField: 'chatListModsSettings',
  merge: (s) => mergeSettings(LIST_MODS_DEFAULTS, s),
});

const { getSettings: getChatListModsSettings, updateSettings: updateChatListModsSettings } = createSettingsHandlers({
  field: 'chatListModsSettings',
  label: 'chat list MODs',
  mergeSettings,
  defaults: LIST_MODS_DEFAULTS,
});

exports.getChatListModsSettings = getChatListModsSettings;

exports.updateChatListModsSettings = updateChatListModsSettings;

exports.toggleHideChats = (req, res) => toggleListModsField(req, res, 'hideChatsEnabled', 'Toggle hide chats');
exports.toggleLockChats = (req, res) => toggleListModsField(req, res, 'lockChatsEnabled', 'Toggle lock chats');
exports.togglePinUnlimited = (req, res) => toggleListModsField(req, res, 'pinUnlimitedChats', 'Toggle pin unlimited');
exports.toggleMarkUnread = (req, res) => toggleListModsField(req, res, 'markUnreadEnabled', 'Toggle mark unread');
exports.toggleArchiveUnlimited = (req, res) => toggleListModsField(req, res, 'archiveUnlimited', 'Toggle archive unlimited');
exports.toggleChatBackup = (req, res) => toggleListModsField(req, res, 'chatBackupEnabled', 'Toggle chat backup');
exports.toggleChatRestore = (req, res) => toggleListModsField(req, res, 'chatRestoreEnabled', 'Toggle chat restore');
exports.toggleChatExport = (req, res) => toggleListModsField(req, res, 'chatExportEnabled', 'Toggle chat export');

// ── Chat search (route prefix /api/chat-search) ─────────────────────────────

const SEARCH_DEFAULTS = {
  chatSearchEnabled: true,
  searchInMessages: true,
  searchInContacts: true,
  searchInGroups: true,
  caseSensitive: false,
  exactMatch: false,
  maxResults: 50,
  saveSearchHistory: true,
  maxHistoryItems: 20,
  highlightResults: true
};

// Shared by searchConversations and searchMessagesInConversation.
const buildSearchRegex = (query, settings) => {
  const flags = settings.caseSensitive ? (settings.exactMatch ? '^' + query + '$' : '') : (settings.exactMatch ? '^' + query + '$' : 'i');
  return new RegExp(query, flags);
};

const { getSettings: getChatSearchSettings, updateSettings: updateChatSearchSettings, resetSettings: resetChatSearchSettings } = createSettingsHandlers({
  field: 'chatSearchSettings',
  label: 'chat search',
  mergeSettings,
  defaults: SEARCH_DEFAULTS,
});

exports.getChatSearchSettings = getChatSearchSettings;

exports.updateChatSearchSettings = updateChatSearchSettings;

exports.searchConversations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { query, searchInMessages, searchInContacts, searchInGroups, limit } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const settings = mergeSettings(SEARCH_DEFAULTS, user.chatSearchSettings?.toObject?.() || user.chatSearchSettings);

    if (!settings.chatSearchEnabled) {
      return res.status(403).json({ success: false, message: 'Chat search is disabled' });
    }

    const searchInMsgs = searchInMessages !== undefined ? searchInMessages : settings.searchInMessages;
    const searchInCont = searchInContacts !== undefined ? searchInContacts : settings.searchInContacts;
    const searchInGrps = searchInGroups !== undefined ? searchInGroups : settings.searchInGroups;
    const maxResults = limit || settings.maxResults;

    const results = {
      conversations: [],
      messages: [],
      contacts: [],
      totalResults: 0
    };

    // Search in conversations
    if (searchInCont || searchInGrps) {
      const conversationQuery = {
        participants: user._id
      };

      if (!searchInGrps) {
        conversationQuery.isGroup = false;
      }
      if (!searchInCont) {
        conversationQuery.isGroup = true;
      }

      const conversations = await Conversation.find(conversationQuery)
        .populate('participants', 'username profilePicture');

      const searchRegex = buildSearchRegex(query, settings);

      const matchingConversations = conversations.filter(conv =>
        searchRegex.test(conv.name || '') ||
        searchRegex.test(conv.description || '')
      );

      results.conversations = matchingConversations.slice(0, maxResults);
    }

    // Search in messages
    if (searchInMsgs) {
      const searchRegex = buildSearchRegex(query, settings);

      const messages = await Message.find({
        sender: user._id,
        content: { $regex: searchRegex }
      }).populate('conversationId', 'name isGroup');

      results.messages = messages.slice(0, maxResults);
    }

    // Search in contacts
    if (searchInCont) {
      const searchRegex = buildSearchRegex(query, settings);

      const contacts = user.contacts || [];
      const matchingContacts = contacts.filter(contact =>
        searchRegex.test(contact.username || '') ||
        searchRegex.test(contact.displayName || '')
      );

      results.contacts = matchingContacts.slice(0, maxResults);
    }

    results.totalResults = results.conversations.length + results.messages.length + results.contacts.length;

    // Save search history if enabled
    if (settings.saveSearchHistory && query.trim() !== '') {
      if (!user.searchHistory) user.searchHistory = [];

      // Remove duplicate if exists
      user.searchHistory = user.searchHistory.filter(h => h.query !== query);

      user.searchHistory.unshift({
        query,
        timestamp: new Date(),
        resultCount: results.totalResults
      });

      // Limit history
      if (user.searchHistory.length > settings.maxHistoryItems) {
        user.searchHistory = user.searchHistory.slice(0, settings.maxHistoryItems);
      }

      user.markModified('searchHistory');
      await user.save();
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Search conversations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchMessagesInConversation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;
    const { query, limit } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const settings = mergeSettings(SEARCH_DEFAULTS, user.chatSearchSettings?.toObject?.() || user.chatSearchSettings);

    if (!settings.chatSearchEnabled) {
      return res.status(403).json({ success: false, message: 'Chat search is disabled' });
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: user._id
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or not accessible' });
    }

    const searchRegex = buildSearchRegex(query, settings);

    const messages = await Message.find({
      conversationId,
      content: { $regex: searchRegex }
    }).sort({ createdAt: -1 });

    const maxResults = limit || settings.maxResults;
    const limitedMessages = messages.slice(0, maxResults);

    res.status(200).json({
      success: true,
      messages: limitedMessages,
      totalResults: messages.length
    });
  } catch (error) {
    console.error('Search messages in conversation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSearchHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const history = user.searchHistory || [];
    const { limit } = req.query;

    const historyLimit = parseInt(limit) || 20;
    const recentHistory = history.slice(0, historyLimit);

    res.status(200).json({ success: true, history: recentHistory });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.clearSearchHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.searchHistory = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Search history cleared' });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSearchHistoryItem = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { query } = req.params;

    const history = user.searchHistory || [];
    user.searchHistory = history.filter(h => h.query !== query);
    await user.save();

    res.status(200).json({ success: true, message: 'Search history item deleted' });
  } catch (error) {
    console.error('Delete search history item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPopularSearches = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const history = user.searchHistory || [];

    // Count frequency of each query
    const searchCounts = {};
    history.forEach(item => {
      const query = item.query.toLowerCase();
      searchCounts[query] = (searchCounts[query] || 0) + 1;
    });

    // Sort by frequency
    const popularSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    res.status(200).json({ success: true, popularSearches });
  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleChatSearch = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatSearchSettings?.toObject?.() || user.chatSearchSettings || {};

    user.chatSearchSettings = mergeSettings(SEARCH_DEFAULTS, {
      ...existing,
      chatSearchEnabled: enabled !== undefined ? enabled : !existing.chatSearchEnabled
    });
    user.markModified('chatSearchSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSearchSettings });
  } catch (error) {
    console.error('Toggle chat search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetChatSearchSettings = resetChatSearchSettings;

// ── Chat folders (route prefix /api/chat-folders) ───────────────────────────

const FOLDERS_DEFAULTS = {
  chatFoldersEnabled: true,
  maxFolders: 20,
  maxChatsPerFolder: 50,
  autoOrganize: false,
  showFolderBadges: true,
  folderColors: ['#00a884', '#34b7f1', '#a855f7', '#f59e0b', '#ef4444', '#10b981']
};

const { getSettings: getChatFoldersSettings, updateSettings: updateChatFoldersSettings, resetSettings: resetChatFoldersSettings } = createSettingsHandlers({
  field: 'chatFoldersSettings',
  label: 'chat folders',
  mergeSettings,
  defaults: FOLDERS_DEFAULTS,
});

exports.getChatFoldersSettings = getChatFoldersSettings;

exports.updateChatFoldersSettings = updateChatFoldersSettings;

exports.createChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const settings = mergeSettings(FOLDERS_DEFAULTS, user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);

    if (!settings.chatFoldersEnabled) {
      return res.status(403).json({ success: false, message: 'Chat folders are disabled' });
    }

    if (!user.chatFolders) user.chatFolders = [];

    if (user.chatFolders.length >= settings.maxFolders) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${settings.maxFolders} folders allowed`
      });
    }

    const folder = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      color: color || settings.folderColors[user.chatFolders.length % settings.folderColors.length],
      icon: icon || 'folder',
      chatIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.chatFolders.push(folder);
    user.markModified('chatFolders');
    await user.save();

    res.status(200).json({ success: true, folder });
  } catch (error) {
    console.error('Create chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Shared by getChatFolders and getChatFolder.
const decorateFolderWithChats = async (user, folder) => {
  const conversations = await Conversation.find({
    _id: { $in: folder.chatIds },
    participants: user._id
  }).populate('participants', 'username profilePicture');

  return {
    ...(folder.toObject ? folder.toObject() : folder),
    conversations,
    chatCount: conversations.length
  };
};

exports.getChatFolders = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const folders = user.chatFolders || [];
    const foldersWithChats = await Promise.all(folders.map((folder) => decorateFolderWithChats(user, folder)));

    res.status(200).json({ success: true, folders: foldersWithChats });
  } catch (error) {
    console.error('Get chat folders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const folder = (user.chatFolders || []).find(f => f._id.toString() === id);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    res.status(200).json({
      success: true,
      folder: await decorateFolderWithChats(user, folder)
    });
  } catch (error) {
    console.error('Get chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { name, color, icon } = req.body;

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    folders[index].name = name || folders[index].name;
    folders[index].color = color !== undefined ? color : folders[index].color;
    folders[index].icon = icon !== undefined ? icon : folders[index].icon;
    folders[index].updatedAt = new Date();

    user.chatFolders = folders;
    user.markModified('chatFolders');
    await user.save();

    res.status(200).json({ success: true, folder: folders[index] });
  } catch (error) {
    console.error('Update chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    folders.splice(index, 1);
    user.chatFolders = folders;
    user.markModified('chatFolders');
    await user.save();

    res.status(200).json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    console.error('Delete chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addChatToFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { folderId } = req.params;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    const settings = mergeSettings(FOLDERS_DEFAULTS, user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === folderId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Check max chats per folder
    if (folders[index].chatIds.length >= settings.maxChatsPerFolder) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${settings.maxChatsPerFolder} chats per folder`
      });
    }

    // Verify conversation exists and belongs to user
    const conversation = await Conversation.findOne({
      _id: chatId,
      participants: user._id
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or not accessible' });
    }

    if (!folders[index].chatIds.includes(chatId)) {
      folders[index].chatIds.push(chatId);
      folders[index].updatedAt = new Date();
    }

    user.chatFolders = folders;
    user.markModified('chatFolders');
    await user.save();

    res.status(200).json({ success: true, folder: folders[index] });
  } catch (error) {
    console.error('Add chat to folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeChatFromFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { folderId, chatId } = req.params;

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === folderId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    folders[index].chatIds = folders[index].chatIds.filter(id => id !== chatId);
    folders[index].updatedAt = new Date();

    user.chatFolders = folders;
    user.markModified('chatFolders');
    await user.save();

    res.status(200).json({ success: true, folder: folders[index] });
  } catch (error) {
    console.error('Remove chat from folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.autoOrganizeChats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(FOLDERS_DEFAULTS, user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);

    if (!settings.autoOrganize) {
      return res.status(403).json({ success: false, message: 'Auto organize is disabled' });
    }

    // Get all conversations
    const conversations = await Conversation.find({
      participants: user._id
    });

    // Create default folders if they don't exist
    const defaultFolders = [
      { name: 'Work', icon: 'briefcase' },
      { name: 'Family', icon: 'users' },
      { name: 'Friends', icon: 'heart' },
      { name: 'Groups', icon: 'users' }
    ];

    for (const defaultFolder of defaultFolders) {
      const existingFolder = (user.chatFolders || []).find(f => f.name === defaultFolder.name);

      if (!existingFolder) {
        const folder = {
          _id: new (require('mongoose').Types.ObjectId)(),
          name: defaultFolder.name,
          icon: defaultFolder.icon,
          color: settings.folderColors[(user.chatFolders?.length || 0) % settings.folderColors.length],
          chatIds: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (!user.chatFolders) user.chatFolders = [];
        user.chatFolders.push(folder);
        user.markModified('chatFolders');
      }
    }

    // Organize conversations into folders (mock logic)
    const folders = user.chatFolders || [];

    conversations.forEach(conv => {
      if (conv.isGroup) {
        const groupsFolder = folders.find(f => f.name === 'Groups');
        if (groupsFolder && !groupsFolder.chatIds.includes(conv._id.toString())) {
          groupsFolder.chatIds.push(conv._id.toString());
        }
      }
    });

    user.chatFolders = folders;
    user.markModified('chatFolders');
    await user.save();

    res.status(200).json({ success: true, folders: user.chatFolders });
  } catch (error) {
    console.error('Auto organize chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleChatFolders = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings || {};

    user.chatFoldersSettings = mergeSettings(FOLDERS_DEFAULTS, {
      ...existing,
      chatFoldersEnabled: enabled !== undefined ? enabled : !existing.chatFoldersEnabled
    });
    user.markModified('chatFoldersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFoldersSettings });
  } catch (error) {
    console.error('Toggle chat folders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetChatFoldersSettings = resetChatFoldersSettings;

