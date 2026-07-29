const User = require('../models/User');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  groupAdminTools: false,
  groupMemberLimitIncrease: false,
  groupDescriptionLength: false,
  groupLinkCustomization: false,
  groupJoinRequestsApproval: false,
  groupAnnouncements: false,
  groupPolls: false,
  groupEvents: false
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

// @desc    Get group MODs settings
// @route   GET /api/group-mods/settings
// @access  Private
exports.getGroupModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.groupModsSettings?.toObject?.() || user.groupModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get group MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update group MODs settings
// @route   POST /api/group-mods/settings
// @access  Private
exports.updateGroupModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    
    user.groupModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('groupModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupModsSettings });
  } catch (error) {
    console.error('Update group MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Admin Tools
// @route   POST /api/group-mods/admin-tools
// @access  Private
exports.toggleAdminTools = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupAdminTools;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupAdminTools: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupAdminTools: newValue });
  } catch (error) {
    console.error('Toggle admin tools error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Member Limit Increase
// @route   POST /api/group-mods/member-limit
// @access  Private
exports.toggleMemberLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupMemberLimitIncrease;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupMemberLimitIncrease: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupMemberLimitIncrease: newValue });
  } catch (error) {
    console.error('Toggle member limit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Description Length
// @route   POST /api/group-mods/description-length
// @access  Private
exports.toggleDescriptionLength = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupDescriptionLength;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupDescriptionLength: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupDescriptionLength: newValue });
  } catch (error) {
    console.error('Toggle description length error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Link Customization
// @route   POST /api/group-mods/link-customization
// @access  Private
exports.toggleLinkCustomization = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupLinkCustomization;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupLinkCustomization: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupLinkCustomization: newValue });
  } catch (error) {
    console.error('Toggle link customization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Join Requests Approval
// @route   POST /api/group-mods/join-approval
// @access  Private
exports.toggleJoinApproval = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupJoinRequestsApproval;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupJoinRequestsApproval: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupJoinRequestsApproval: newValue });
  } catch (error) {
    console.error('Toggle join approval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Announcements
// @route   POST /api/group-mods/announcements
// @access  Private
exports.toggleAnnouncements = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupAnnouncements;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupAnnouncements: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupAnnouncements: newValue });
  } catch (error) {
    console.error('Toggle announcements error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Polls
// @route   POST /api/group-mods/polls
// @access  Private
exports.togglePolls = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupPolls;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupPolls: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupPolls: newValue });
  } catch (error) {
    console.error('Toggle polls error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Group Events
// @route   POST /api/group-mods/events
// @access  Private
exports.toggleEvents = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.groupModsSettings?.toObject?.() || user.groupModsSettings || {};
    const newValue = !existing.groupEvents;
    
    user.groupModsSettings = mergeSettings({ ...existing, groupEvents: newValue });
    user.markModified('groupModsSettings');
    await user.save();

    res.json({ success: true, groupEvents: newValue });
  } catch (error) {
    console.error('Toggle events error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
