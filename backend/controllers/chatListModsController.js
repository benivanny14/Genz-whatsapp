const User = require('../models/User');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  hideChatsEnabled: false,
  lockChatsEnabled: false,
  pinUnlimitedChats: false,
  markUnreadEnabled: false,
  archiveUnlimited: false,
  chatBackupEnabled: false,
  chatRestoreEnabled: false,
  chatExportEnabled: false
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

// @desc    Get chat list MODs settings
// @route   GET /api/chat-list-mods/settings
// @access  Private
exports.getChatListModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatListModsSettings?.toObject?.() || user.chatListModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat list MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat list MODs settings
// @route   POST /api/chat-list-mods/settings
// @access  Private
exports.updateChatListModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    
    user.chatListModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatListModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatListModsSettings });
  } catch (error) {
    console.error('Update chat list MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Hide Chats
// @route   POST /api/chat-list-mods/hide-chats
// @access  Private
exports.toggleHideChats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.hideChatsEnabled;
    
    user.chatListModsSettings = mergeSettings({ ...existing, hideChatsEnabled: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, hideChatsEnabled: newValue });
  } catch (error) {
    console.error('Toggle hide chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Lock Chats
// @route   POST /api/chat-list-mods/lock-chats
// @access  Private
exports.toggleLockChats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.lockChatsEnabled;
    
    user.chatListModsSettings = mergeSettings({ ...existing, lockChatsEnabled: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, lockChatsEnabled: newValue });
  } catch (error) {
    console.error('Toggle lock chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Pin Unlimited Chats
// @route   POST /api/chat-list-mods/pin-unlimited
// @access  Private
exports.togglePinUnlimited = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.pinUnlimitedChats;
    
    user.chatListModsSettings = mergeSettings({ ...existing, pinUnlimitedChats: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, pinUnlimitedChats: newValue });
  } catch (error) {
    console.error('Toggle pin unlimited error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Mark Unread
// @route   POST /api/chat-list-mods/mark-unread
// @access  Private
exports.toggleMarkUnread = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.markUnreadEnabled;
    
    user.chatListModsSettings = mergeSettings({ ...existing, markUnreadEnabled: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, markUnreadEnabled: newValue });
  } catch (error) {
    console.error('Toggle mark unread error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Archive Unlimited
// @route   POST /api/chat-list-mods/archive-unlimited
// @access  Private
exports.toggleArchiveUnlimited = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.archiveUnlimited;
    
    user.chatListModsSettings = mergeSettings({ ...existing, archiveUnlimited: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, archiveUnlimited: newValue });
  } catch (error) {
    console.error('Toggle archive unlimited error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Chat Backup
// @route   POST /api/chat-list-mods/chat-backup
// @access  Private
exports.toggleChatBackup = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.chatBackupEnabled;
    
    user.chatListModsSettings = mergeSettings({ ...existing, chatBackupEnabled: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, chatBackupEnabled: newValue });
  } catch (error) {
    console.error('Toggle chat backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Chat Restore
// @route   POST /api/chat-list-mods/chat-restore
// @access  Private
exports.toggleChatRestore = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.chatRestoreEnabled;
    
    user.chatListModsSettings = mergeSettings({ ...existing, chatRestoreEnabled: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, chatRestoreEnabled: newValue });
  } catch (error) {
    console.error('Toggle chat restore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Chat Export
// @route   POST /api/chat-list-mods/chat-export
// @access  Private
exports.toggleChatExport = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.chatListModsSettings?.toObject?.() || user.chatListModsSettings || {};
    const newValue = !existing.chatExportEnabled;
    
    user.chatListModsSettings = mergeSettings({ ...existing, chatExportEnabled: newValue });
    user.markModified('chatListModsSettings');
    await user.save();

    res.json({ success: true, chatExportEnabled: newValue });
  } catch (error) {
    console.error('Toggle chat export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
