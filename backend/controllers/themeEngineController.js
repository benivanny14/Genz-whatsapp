const User = require('../models/User');

const defaultSettings = {
  themeEngineEnabled: true,
  // Font Settings
  customFontEnabled: false,
  fontFamily: 'Inter',
  fontSize: 'medium', // small, medium, large, extra
  customFontSize: 14,
  
  // Theme Settings
  themeMode: 'auto', // dark, light, auto, night
  amoledMode: false,
  customThemeEnabled: false,
  customThemeColor: '#008069',
  
  // Color Customization
  customBubbleColorEnabled: false,
  customBubbleColor: '#008069',
  customHeaderColorEnabled: false,
  customHeaderColor: '#008069',
  customStatusBarColorEnabled: false,
  customStatusBarColor: '#008069',
  customNavigationBarColor: '#008069',
  
  // UI Customization
  chatBubbleStyle: 'default',
  tickStyle: 'default',
  launcherIconChanged: false,
  notificationIconChanged: false,
  customNotificationSounds: false,
  popupNotifications: true,
  fabCustomization: false,
  homeScreenStyle: 'default',
  conversationEntryStyle: 'default',
  emojiStyle: 'default',
  
  // Available Options
  availableFonts: ['Inter', 'Roboto', 'Poppins', 'Comic Neue', 'JetBrains Mono', 'Space Grotesk'],
  availableBubbleStyles: ['default', 'rounded', 'square', 'modern'],
  availableTickStyles: ['default', 'colored', 'minimal', 'bold'],
  availableEmojiStyles: ['default', 'ios', 'android', 'twitter']
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

// @desc    Get theme engine settings
// @route   GET /api/theme-engine/settings
// @access  Private
exports.getThemeEngineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.themeEngineSettings?.toObject?.() || user.themeEngineSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get theme engine settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update theme engine settings
// @route   POST /api/theme-engine/settings
// @access  Private
exports.updateThemeEngineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};
    
    user.themeEngineSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update theme engine settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update font settings
// @route   POST /api/theme-engine/font
// @access  Private
exports.updateFontSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { fontFamily, fontSize, customFontSize, customFontEnabled } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};
    
    user.themeEngineSettings = mergeSettings({
      ...existing,
      fontFamily: fontFamily || existing.fontFamily,
      fontSize: fontSize || existing.fontSize,
      customFontSize: customFontSize !== undefined ? customFontSize : existing.customFontSize,
      customFontEnabled: customFontEnabled !== undefined ? customFontEnabled : existing.customFontEnabled
    });
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update font settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update theme mode
// @route   POST /api/theme-engine/mode
// @access  Private
exports.updateThemeMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { themeMode, amoledMode } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};
    
    user.themeEngineSettings = mergeSettings({
      ...existing,
      themeMode: themeMode || existing.themeMode,
      amoledMode: amoledMode !== undefined ? amoledMode : existing.amoledMode
    });
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update theme mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update custom colors
// @route   POST /api/theme-engine/colors
// @access  Private
exports.updateCustomColors = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { 
      customThemeColor, 
      customBubbleColor, 
      customHeaderColor, 
      customStatusBarColor,
      customNavigationBarColor,
      customBubbleColorEnabled,
      customHeaderColorEnabled,
      customStatusBarColorEnabled
    } = req.body;
    
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};
    
    user.themeEngineSettings = mergeSettings({
      ...existing,
      customThemeColor: customThemeColor || existing.customThemeColor,
      customBubbleColor: customBubbleColor || existing.customBubbleColor,
      customHeaderColor: customHeaderColor || existing.customHeaderColor,
      customStatusBarColor: customStatusBarColor || existing.customStatusBarColor,
      customNavigationBarColor: customNavigationBarColor || existing.customNavigationBarColor,
      customBubbleColorEnabled: customBubbleColorEnabled !== undefined ? customBubbleColorEnabled : existing.customBubbleColorEnabled,
      customHeaderColorEnabled: customHeaderColorEnabled !== undefined ? customHeaderColorEnabled : existing.customHeaderColorEnabled,
      customStatusBarColorEnabled: customStatusBarColorEnabled !== undefined ? customStatusBarColorEnabled : existing.customStatusBarColorEnabled
    });
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update custom colors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update UI customization
// @route   POST /api/theme-engine/ui-customization
// @access  Private
exports.updateUICustomization = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { 
      chatBubbleStyle, 
      tickStyle, 
      emojiStyle,
      launcherIconChanged,
      notificationIconChanged,
      customNotificationSounds,
      popupNotifications,
      fabCustomization,
      homeScreenStyle,
      conversationEntryStyle
    } = req.body;
    
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};
    
    user.themeEngineSettings = mergeSettings({
      ...existing,
      chatBubbleStyle: chatBubbleStyle || existing.chatBubbleStyle,
      tickStyle: tickStyle || existing.tickStyle,
      emojiStyle: emojiStyle || existing.emojiStyle,
      launcherIconChanged: launcherIconChanged !== undefined ? launcherIconChanged : existing.launcherIconChanged,
      notificationIconChanged: notificationIconChanged !== undefined ? notificationIconChanged : existing.notificationIconChanged,
      customNotificationSounds: customNotificationSounds !== undefined ? customNotificationSounds : existing.customNotificationSounds,
      popupNotifications: popupNotifications !== undefined ? popupNotifications : existing.popupNotifications,
      fabCustomization: fabCustomization !== undefined ? fabCustomization : existing.fabCustomization,
      homeScreenStyle: homeScreenStyle || existing.homeScreenStyle,
      conversationEntryStyle: conversationEntryStyle || existing.conversationEntryStyle
    });
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update UI customization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get available options
// @route   GET /api/theme-engine/options
// @access  Private
exports.getAvailableOptions = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.themeEngineSettings?.toObject?.() || user.themeEngineSettings);
    
    res.status(200).json({
      success: true,
      options: {
        fonts: settings.availableFonts,
        bubbleStyles: settings.availableBubbleStyles,
        tickStyles: settings.availableTickStyles,
        emojiStyles: settings.availableEmojiStyles,
        themeModes: ['dark', 'light', 'auto', 'night'],
        fontSizes: ['small', 'medium', 'large', 'extra']
      }
    });
  } catch (error) {
    console.error('Get available options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle theme engine
// @route   POST /api/theme-engine/toggle
// @access  Private
exports.toggleThemeEngine = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};
    
    user.themeEngineSettings = mergeSettings({
      ...existing,
      themeEngineEnabled: enabled !== undefined ? enabled : !existing.themeEngineEnabled
    });
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Toggle theme engine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset theme engine settings to default
// @route   POST /api/theme-engine/reset
// @access  Private
exports.resetThemeEngineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.themeEngineSettings = mergeSettings({});
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Reset theme engine settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
