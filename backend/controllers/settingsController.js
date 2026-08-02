const User = require('../models/User');
const { createDefaultWhatsAppSettings, mergeWhatsAppSettings } = require('../utils/whatsappSettings');

/**
 * Get user settings
 * Returns the user's settings from the database
 */
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
      settings: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings'
    });
  }
};

/**
 * Update user settings
 * Updates the user's settings in the database
 */
exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Merge incoming settings with existing settings (deep merge + option validation)
    const currentSettings = user.settings || createDefaultWhatsAppSettings();
    const updatedSettings = mergeWhatsAppSettings(currentSettings, req.body);

    // Sync account.email into the top-level user email so both stay in lockstep.
    const accountEmail = updatedSettings?.account?.email;
    if (accountEmail !== undefined && accountEmail !== null && String(accountEmail).trim() !== '') {
      user.email = String(accountEmail).trim().toLowerCase();
    }

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

/**
 * Reset user settings to defaults
 * Resets all settings to their default values
 */
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
