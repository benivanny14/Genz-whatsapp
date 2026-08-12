/**
 * userSettingsController.js
 * -------------------------
 * Consolidated controller for user settings + customization MODs + theme
 * engine (step 4 of REFACTOR_PLAN.md — merges settingsController.js +
 * customizationModsController.js + themeEngineController.js).
 *
 * The three original controllers duplicated getUser/mergeSettings
 * scaffolding and (for customization MODs) 8 near-identical toggle
 * handlers. This file keeps every exported handler name and route path
 * intact — only the internal wiring is shared now.
 *
 *   /api/settings/...        →  getSettings, updateSettings, resetSettings
 *   /api/customization-mods/ →  getCustomizationModsSettings, toggle*
 *   /api/theme-engine/...    →  theme settings + font/mode/colors/UI handlers
 */

const User = require('../models/User');
const { createDefaultWhatsAppSettings, mergeWhatsAppSettings, validateSettingsOptions } = require('../utils/whatsappSettings');
const { getUser, mergeSettings, createToggleHandler } = require('../services/userScopedService');

// ── Shared helpers (previously duplicated across all three controllers) ─────

// Mongoose drops undefined keys on save and JSON.stringify omits them, but the
// in-memory settings object would otherwise keep explicit `key: undefined`
// entries that shadow the merged defaults (e.g. `customBubbleColor || existing`
// when neither is set). Strip them so update responses always carry the full
// merged defaults — same class of fix as whatsappWeb.updateSyncSettings.
const compactSettings = (settings) => {
  Object.keys(settings).forEach((key) => {
    if (settings[key] === undefined) delete settings[key];
  });
  return settings;
};



// ── User settings (route prefix /api/settings) ──────────────────────────────
// NOTE: these three handlers historically used User.findById(req.user._id)
// directly and answered 404 (not 401) for a missing user. Behavior preserved.

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return settings, defaulting to empty object if not set
    const settings = user.settings || createDefaultWhatsAppSettings();

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings'
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // SECURITY (3.4): reject invalid enum-style setting values with a 400
    // instead of silently coercing them to defaults — same guard as
    // authController.updateSettings, so /api/settings and the auth route agree.
    const incoming = req.body?.settings || req.body || {};
    const validationError = validateSettingsOptions(incoming);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Merge incoming settings with existing settings (deep merge + option validation)
    const currentSettings = user.settings || createDefaultWhatsAppSettings();
    const updatedSettings = mergeWhatsAppSettings(currentSettings, incoming);

    user.settings = updatedSettings;
    user.markModified('settings');
    await user.save();

    res.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};

exports.resetSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const defaultSettings = createDefaultWhatsAppSettings();
    user.settings = defaultSettings;
    user.markModified('settings');
    await user.save();

    res.json({
      success: true,
      settings: defaultSettings,
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings'
    });
  }
};

// ── Customization MODs (route prefix /api/customization-mods) ───────────────

const CUSTOMIZATION_DEFAULTS = {
  customTicksEnabled: false,
  customFontsEnabled: false,
  customBubbleColorsEnabled: false,
  customHeaderEnabled: false,
  customNavigationEnabled: false,
  customIconsEnabled: false,
  customEmojisEnabled: false,
  themesStoreEnabled: false
};

// Generic single-field toggle — every customization-mods toggle is identical
// apart from the field name and log label.
const toggleCustomizationField = createToggleHandler({
  settingsField: 'customizationModsSettings',
  merge: (s) => mergeSettings(CUSTOMIZATION_DEFAULTS, s),
  transform: compactSettings,
});

exports.getCustomizationModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(CUSTOMIZATION_DEFAULTS, user.customizationModsSettings?.toObject?.() || user.customizationModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get customization MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCustomizationModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.customizationModsSettings?.toObject?.() || user.customizationModsSettings || {};

    user.customizationModsSettings = mergeSettings(CUSTOMIZATION_DEFAULTS, compactSettings({ ...existing, ...incoming }));
    user.markModified('customizationModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.customizationModsSettings });
  } catch (error) {
    console.error('Update customization MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleCustomTicks = (req, res) => toggleCustomizationField(req, res, 'customTicksEnabled', 'Toggle custom ticks');
exports.toggleCustomFonts = (req, res) => toggleCustomizationField(req, res, 'customFontsEnabled', 'Toggle custom fonts');
exports.toggleCustomBubbleColors = (req, res) => toggleCustomizationField(req, res, 'customBubbleColorsEnabled', 'Toggle custom bubble colors');
exports.toggleCustomHeader = (req, res) => toggleCustomizationField(req, res, 'customHeaderEnabled', 'Toggle custom header');
exports.toggleCustomNavigation = (req, res) => toggleCustomizationField(req, res, 'customNavigationEnabled', 'Toggle custom navigation');
exports.toggleCustomIcons = (req, res) => toggleCustomizationField(req, res, 'customIconsEnabled', 'Toggle custom icons');
exports.toggleCustomEmojis = (req, res) => toggleCustomizationField(req, res, 'customEmojisEnabled', 'Toggle custom emojis');
exports.toggleThemesStore = (req, res) => toggleCustomizationField(req, res, 'themesStoreEnabled', 'Toggle themes store');

// ── Theme engine (route prefix /api/theme-engine) ───────────────────────────

const THEME_DEFAULTS = {
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
  legacy2014Mode: false,

  // Available Options
  availableFonts: ['Inter', 'Roboto', 'Poppins', 'Comic Neue', 'JetBrains Mono', 'Space Grotesk'],
  availableBubbleStyles: ['default', 'rounded', 'square', 'modern'],
  availableTickStyles: ['default', 'colored', 'minimal', 'bold'],
  availableEmojiStyles: ['default', 'ios', 'android', 'twitter']
};

exports.getThemeEngineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(THEME_DEFAULTS, user.themeEngineSettings?.toObject?.() || user.themeEngineSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get theme engine settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateThemeEngineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings({ ...existing, ...incoming }));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update theme engine settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFontSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { fontFamily, fontSize, customFontSize, customFontEnabled } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {
      ...existing,
      fontFamily: fontFamily || existing.fontFamily,
      fontSize: fontSize || existing.fontSize,
      customFontSize: customFontSize !== undefined ? customFontSize : existing.customFontSize,
      customFontEnabled: customFontEnabled !== undefined ? customFontEnabled : existing.customFontEnabled
    });
    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings(user.themeEngineSettings));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update font settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateThemeMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { themeMode, amoledMode } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {
      ...existing,
      themeMode: themeMode || existing.themeMode,
      amoledMode: amoledMode !== undefined ? amoledMode : existing.amoledMode
    });
    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings(user.themeEngineSettings));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update theme mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {
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
    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings(user.themeEngineSettings));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update custom colors error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {
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
    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings(user.themeEngineSettings));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Update UI customization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAvailableOptions = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(THEME_DEFAULTS, user.themeEngineSettings?.toObject?.() || user.themeEngineSettings);

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

exports.toggleThemeEngine = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {
      ...existing,
      themeEngineEnabled: enabled !== undefined ? enabled : !existing.themeEngineEnabled
    });
    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings(user.themeEngineSettings));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Toggle theme engine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleLegacy2014 = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.themeEngineSettings?.toObject?.() || user.themeEngineSettings || {};

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {
      ...existing,
      legacy2014Mode: enabled !== undefined ? enabled : !existing.legacy2014Mode
    });
    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, compactSettings(user.themeEngineSettings));
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, legacy2014Mode: user.themeEngineSettings.legacy2014Mode });
  } catch (error) {
    console.error('Toggle legacy 2014 error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetThemeEngineSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.themeEngineSettings = mergeSettings(THEME_DEFAULTS, {});
    user.markModified('themeEngineSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.themeEngineSettings });
  } catch (error) {
    console.error('Reset theme engine settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

