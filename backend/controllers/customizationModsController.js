const User = require('../models/User');

const defaultSettings = {
  customTicksEnabled: false,
  customFontsEnabled: false,
  customBubbleColorsEnabled: false,
  customHeaderEnabled: false,
  customNavigationEnabled: false,
  customIconsEnabled: false,
  customEmojisEnabled: false,
  themesStoreEnabled: false
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

// @desc    Get customization MODs settings
// @route   GET /api/customization-mods/settings
// @access  Private
exports.getCustomizationModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.customizationModsSettings?.toObject?.() || user.customizationModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get customization MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customization MODs settings
// @route   POST /api/customization-mods/settings
// @access  Private
exports.updateCustomizationModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    
    user.customizationModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('customizationModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.customizationModsSettings });
  } catch (error) {
    console.error('Update customization MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Ticks
// @route   POST /api/customization-mods/custom-ticks
// @access  Private
exports.toggleCustomTicks = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customTicksEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customTicksEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customTicksEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom ticks error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Fonts
// @route   POST /api/customization-mods/custom-fonts
// @access  Private
exports.toggleCustomFonts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customFontsEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customFontsEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customFontsEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom fonts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Bubble Colors
// @route   POST /api/customization-mods/custom-bubble-colors
// @access  Private
exports.toggleCustomBubbleColors = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customBubbleColorsEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customBubbleColorsEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customBubbleColorsEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom bubble colors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Header
// @route   POST /api/customization-mods/custom-header
// @access  Private
exports.toggleCustomHeader = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customHeaderEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customHeaderEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customHeaderEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom header error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Navigation
// @route   POST /api/customization-mods/custom-navigation
// @access  Private
exports.toggleCustomNavigation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customNavigationEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customNavigationEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customNavigationEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom navigation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Icons
// @route   POST /api/customization-mods/custom-icons
// @access  Private
exports.toggleCustomIcons = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customIconsEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customIconsEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customIconsEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom icons error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Custom Emojis
// @route   POST /api/customization-mods/custom-emojis
// @access  Private
exports.toggleCustomEmojis = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.customEmojisEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, customEmojisEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, customEmojisEnabled: newValue });
  } catch (error) {
    console.error('Toggle custom emojis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Themes Store
// @route   POST /api/customization-mods/themes-store
// @access  Private
exports.toggleThemesStore = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};
    const newValue = !existing.themesStoreEnabled;
    
    user.customizationModsSettings = mergeSettings({ ...existing, themesStoreEnabled: newValue });
    user.markModified('customizationModsSettings');
    await user.save();

    res.json({ success: true, themesStoreEnabled: newValue });
  } catch (error) {
    console.error('Toggle themes store error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
