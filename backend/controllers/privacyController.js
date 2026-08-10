
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

const defaultSettings = {
  freezeLastSeen: false,
  ghostMode: false,
  hideOnline: false,
  antiViewOnce: false,
  disableForwardedTag: false,
  hideStatusView: false,
  hideReadReceipts: false,
  whoViewedProfile: false,
  contactOnlineNotifier: false,
  autoDownloadStatus: false,
  languagePerChat: false,
  customTickPerContact: false,
  customEmojiStyle: false,
  blockAlerts: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get privacy MODs settings
// @route   GET /api/privacy-mods/settings
// @access  Private
const { getSettings: getPrivacyModsSettings, updateSettings: updatePrivacyModsSettings } = createSettingsHandlers({
  field: 'privacyModsSettings',
  label: 'privacy MODs',
  mergeSettings,
});

exports.getPrivacyModsSettings = getPrivacyModsSettings;

// @desc    Update privacy MODs settings
// @route   POST /api/privacy-mods/settings
// @access  Private
exports.updatePrivacyModsSettings = updatePrivacyModsSettings;

// @desc    Toggle Freeze Last Seen
// @route   POST /api/privacy-mods/freeze-last-seen
// @access  Private
exports.toggleFreezeLastSeen = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.freezeLastSeen;
    
    user.privacyModsSettings = mergeSettings({ ...existing, freezeLastSeen: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, freezeLastSeen: newValue });
  } catch (error) {
    console.error('Toggle freeze last seen error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Ghost Mode
// @route   POST /api/privacy-mods/ghost-mode
// @access  Private
exports.toggleGhostMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.ghostMode;
    
    user.privacyModsSettings = mergeSettings({ ...existing, ghostMode: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, ghostMode: newValue });
  } catch (error) {
    console.error('Toggle ghost mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Hide Online
// @route   POST /api/privacy-mods/hide-online
// @access  Private
exports.toggleHideOnline = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.hideOnline;
    
    user.privacyModsSettings = mergeSettings({ ...existing, hideOnline: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, hideOnline: newValue });
  } catch (error) {
    console.error('Toggle hide online error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Anti-View Once
// @route   POST /api/privacy-mods/anti-view-once
// @access  Private
exports.toggleAntiViewOnce = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.antiViewOnce;
    
    user.privacyModsSettings = mergeSettings({ ...existing, antiViewOnce: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, antiViewOnce: newValue });
  } catch (error) {
    console.error('Toggle anti view once error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Disable Forwarded Tag
// @route   POST /api/privacy-mods/disable-forwarded-tag
// @access  Private
exports.toggleDisableForwardedTag = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.disableForwardedTag;
    
    user.privacyModsSettings = mergeSettings({ ...existing, disableForwardedTag: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, disableForwardedTag: newValue });
  } catch (error) {
    console.error('Toggle disable forwarded tag error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Hide Status View
// @route   POST /api/privacy-mods/hide-status-view
// @access  Private
exports.toggleHideStatusView = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.hideStatusView;
    
    user.privacyModsSettings = mergeSettings({ ...existing, hideStatusView: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, hideStatusView: newValue });
  } catch (error) {
    console.error('Toggle hide status view error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Hide Read Receipts
// @route   POST /api/privacy-mods/hide-read-receipts
// @access  Private
exports.toggleHideReadReceipts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.hideReadReceipts;
    
    user.privacyModsSettings = mergeSettings({ ...existing, hideReadReceipts: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, hideReadReceipts: newValue });
  } catch (error) {
    console.error('Toggle hide read receipts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Who Viewed Profile
// @route   POST /api/privacy-mods/who-viewed-profile
// @access  Private
exports.toggleWhoViewedProfile = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.whoViewedProfile;
    
    user.privacyModsSettings = mergeSettings({ ...existing, whoViewedProfile: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, whoViewedProfile: newValue });
  } catch (error) {
    console.error('Toggle who viewed profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Contact Online Notifier
// @route   POST /api/privacy-mods/contact-online-notifier
// @access  Private
exports.toggleContactOnlineNotifier = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.contactOnlineNotifier;
    
    user.privacyModsSettings = mergeSettings({ ...existing, contactOnlineNotifier: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, contactOnlineNotifier: newValue });
  } catch (error) {
    console.error('Toggle contact online notifier error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Download Status
// @route   POST /api/privacy-mods/auto-download-status
// @access  Private
exports.toggleAutoDownloadStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.autoDownloadStatus;
    
    user.privacyModsSettings = mergeSettings({ ...existing, autoDownloadStatus: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, autoDownloadStatus: newValue });
  } catch (error) {
    console.error('Toggle auto download status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Language Per Chat
// @route   POST /api/privacy-mods/language-per-chat
// @access  Private
exports.toggleLanguagePerChat = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.languagePerChat;
    
    user.privacyModsSettings = mergeSettings({ ...existing, languagePerChat: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, languagePerChat: newValue });
  } catch (error) {
    console.error('Toggle language per chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Tick Per Contact
// @route   POST /api/privacy-mods/custom-tick-per-contact
// @access  Private
exports.toggleCustomTickPerContact = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.customTickPerContact;
    
    user.privacyModsSettings = mergeSettings({ ...existing, customTickPerContact: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, customTickPerContact: newValue });
  } catch (error) {
    console.error('Toggle custom tick per contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Emoji Style
// @route   POST /api/privacy-mods/custom-emoji-style
// @access  Private
exports.toggleCustomEmojiStyle = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.customEmojiStyle;
    
    user.privacyModsSettings = mergeSettings({ ...existing, customEmojiStyle: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, customEmojiStyle: newValue });
  } catch (error) {
    console.error('Toggle custom emoji style error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Block/Unblock Alerts
// @route   POST /api/privacy-mods/block-alerts
// @access  Private
exports.toggleBlockAlerts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.privacyModsSettings?.toObject?.() || user.privacyModsSettings || {};
    const newValue = !existing.blockAlerts;

    user.privacyModsSettings = mergeSettings({ ...existing, blockAlerts: newValue });
    user.markModified('privacyModsSettings');
    await user.save();

    res.json({ success: true, blockAlerts: newValue });
  } catch (error) {
    console.error('Toggle block alerts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get block/unblock alerts for current user
// @route   GET /api/privacy-mods/block-alerts
// @access  Private
exports.getBlockAlerts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const alerts = (user.blockAlerts || []).slice(-100).reverse();
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Get block alerts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear block/unblock alerts
// @route   DELETE /api/privacy-mods/block-alerts
// @access  Private
exports.clearBlockAlerts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.blockAlerts = [];
    await user.save();

    res.json({ success: true, message: 'Block alerts cleared' });
  } catch (error) {
    console.error('Clear block alerts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

