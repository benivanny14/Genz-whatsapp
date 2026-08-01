const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
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

// @desc    Get chat search settings
// @route   GET /api/chat-search/settings
// @access  Private
exports.getChatSearchSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatSearchSettings?.toObject?.() || user.chatSearchSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat search settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat search settings
// @route   POST /api/chat-search/settings
// @access  Private
exports.updateChatSearchSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatSearchSettings?.toObject?.() || user.chatSearchSettings || {};
    
    user.chatSearchSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatSearchSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSearchSettings });
  } catch (error) {
    console.error('Update chat search settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search conversations
// @route   POST /api/chat-search/search
// @access  Private
exports.searchConversations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { query, searchInMessages, searchInContacts, searchInGroups, limit } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const settings = mergeSettings(user.chatSearchSettings?.toObject?.() || user.chatSearchSettings);
    
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

      const searchRegex = settings.caseSensitive 
        ? new RegExp(query, settings.exactMatch ? '^' + query + '$' : '')
        : new RegExp(query, settings.exactMatch ? '^' + query + '$' : 'i');

      const matchingConversations = conversations.filter(conv => 
        searchRegex.test(conv.name || '') ||
        searchRegex.test(conv.description || '')
      );

      results.conversations = matchingConversations.slice(0, maxResults);
    }

    // Search in messages
    if (searchInMsgs) {
      const searchRegex = settings.caseSensitive 
        ? new RegExp(query, settings.exactMatch ? '^' + query + '$' : '')
        : new RegExp(query, settings.exactMatch ? '^' + query + '$' : 'i');

      const messages = await Message.find({
        sender: user._id,
        content: { $regex: searchRegex }
      }).populate('conversationId', 'name isGroup');

      results.messages = messages.slice(0, maxResults);
    }

    // Search in contacts
    if (searchInCont) {
      const searchRegex = settings.caseSensitive 
        ? new RegExp(query, settings.exactMatch ? '^' + query + '$' : '')
        : new RegExp(query, settings.exactMatch ? '^' + query + '$' : 'i');

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

// @desc    Search messages in specific conversation
// @route   POST /api/chat-search/messages/:conversationId
// @access  Private
exports.searchMessagesInConversation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;
    const { query, limit } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const settings = mergeSettings(user.chatSearchSettings?.toObject?.() || user.chatSearchSettings);
    
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

    const searchRegex = settings.caseSensitive 
      ? new RegExp(query, settings.exactMatch ? '^' + query + '$' : '')
      : new RegExp(query, settings.exactMatch ? '^' + query + '$' : 'i');

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

// @desc    Get search history
// @route   GET /api/chat-search/history
// @access  Private
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

// @desc    Clear search history
// @route   DELETE /api/chat-search/history
// @access  Private
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

// @desc    Delete search history item
// @route   DELETE /api/chat-search/history/:query
// @access  Private
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

// @desc    Get popular searches
// @route   GET /api/chat-search/popular
// @access  Private
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

// @desc    Toggle chat search
// @route   POST /api/chat-search/toggle
// @access  Private
exports.toggleChatSearch = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatSearchSettings?.toObject?.() || user.chatSearchSettings || {};
    
    user.chatSearchSettings = mergeSettings({
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

// @desc    Reset chat search settings to default
// @route   POST /api/chat-search/reset
// @access  Private
exports.resetChatSearchSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatSearchSettings = mergeSettings({});
    user.markModified('chatSearchSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatSearchSettings });
  } catch (error) {
    console.error('Reset chat search settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
