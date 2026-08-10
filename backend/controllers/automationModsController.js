
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  autoReplyEnabled: false,
  autoReplyAIEnabled: false,
  autoDeleteMessages: false,
  autoDeleteAfterDays: 30,
  autoArchiveChats: false,
  autoArchiveAfterDays: 90,
  autoMuteGroups: false,
  welcomeMessageEnabled: false,
  welcomeMessageText: '',
  goodbyeMessageEnabled: false,
  goodbyeMessageText: ''
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get automation MODs settings
// @route   GET /api/automation-mods/settings
// @access  Private
exports.getAutomationModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.automationModsSettings?.toObject?.() || user.automationModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get automation MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update automation MODs settings
// @route   POST /api/automation-mods/settings
// @access  Private
exports.updateAutomationModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    
    user.automationModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('automationModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.automationModsSettings });
  } catch (error) {
    console.error('Update automation MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Reply
// @route   POST /api/automation-mods/auto-reply
// @access  Private
exports.toggleAutoReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.autoReplyEnabled;
    
    user.automationModsSettings = mergeSettings({ ...existing, autoReplyEnabled: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoReplyEnabled: newValue });
  } catch (error) {
    console.error('Toggle auto reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Reply AI
// @route   POST /api/automation-mods/auto-reply-ai
// @access  Private
exports.toggleAutoReplyAI = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.autoReplyAIEnabled;
    
    user.automationModsSettings = mergeSettings({ ...existing, autoReplyAIEnabled: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoReplyAIEnabled: newValue });
  } catch (error) {
    console.error('Toggle auto reply AI error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Delete Messages
// @route   POST /api/automation-mods/auto-delete
// @access  Private
exports.toggleAutoDelete = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.autoDeleteMessages;
    
    user.automationModsSettings = mergeSettings({ ...existing, autoDeleteMessages: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoDeleteMessages: newValue });
  } catch (error) {
    console.error('Toggle auto delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Auto-Delete After Days
// @route   POST /api/automation-mods/auto-delete-days
// @access  Private
exports.updateAutoDeleteDays = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { days } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    
    user.automationModsSettings = mergeSettings({ ...existing, autoDeleteAfterDays: days });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoDeleteAfterDays: days });
  } catch (error) {
    console.error('Update auto delete days error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Archive Chats
// @route   POST /api/automation-mods/auto-archive
// @access  Private
exports.toggleAutoArchive = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.autoArchiveChats;
    
    user.automationModsSettings = mergeSettings({ ...existing, autoArchiveChats: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoArchiveChats: newValue });
  } catch (error) {
    console.error('Toggle auto archive error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Auto-Archive After Days
// @route   POST /api/automation-mods/auto-archive-days
// @access  Private
exports.updateAutoArchiveDays = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { days } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    
    user.automationModsSettings = mergeSettings({ ...existing, autoArchiveAfterDays: days });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoArchiveAfterDays: days });
  } catch (error) {
    console.error('Update auto archive days error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Mute Groups
// @route   POST /api/automation-mods/auto-mute-groups
// @access  Private
exports.toggleAutoMuteGroups = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.autoMuteGroups;
    
    user.automationModsSettings = mergeSettings({ ...existing, autoMuteGroups: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoMuteGroups: newValue });
  } catch (error) {
    console.error('Toggle auto mute groups error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Welcome Message
// @route   POST /api/automation-mods/welcome-message
// @access  Private
exports.toggleWelcomeMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.welcomeMessageEnabled;
    
    user.automationModsSettings = mergeSettings({ ...existing, welcomeMessageEnabled: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, welcomeMessageEnabled: newValue });
  } catch (error) {
    console.error('Toggle welcome message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Welcome Message Text
// @route   POST /api/automation-mods/welcome-message-text
// @access  Private
exports.updateWelcomeMessageText = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    
    user.automationModsSettings = mergeSettings({ ...existing, welcomeMessageText: text });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, welcomeMessageText: text });
  } catch (error) {
    console.error('Update welcome message text error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Goodbye Message
// @route   POST /api/automation-mods/goodbye-message
// @access  Private
exports.toggleGoodbyeMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.goodbyeMessageEnabled;
    
    user.automationModsSettings = mergeSettings({ ...existing, goodbyeMessageEnabled: newValue });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, goodbyeMessageEnabled: newValue });
  } catch (error) {
    console.error('Toggle goodbye message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Goodbye Message Text
// @route   POST /api/automation-mods/goodbye-message-text
// @access  Private
exports.updateGoodbyeMessageText = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    
    user.automationModsSettings = mergeSettings({ ...existing, goodbyeMessageText: text });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, goodbyeMessageText: text });
  } catch (error) {
    console.error('Update goodbye message text error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

