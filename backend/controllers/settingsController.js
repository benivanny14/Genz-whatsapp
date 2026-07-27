const User = require('../models/User');
const { createDefaultWhatsAppSettings } = require('../utils/whatsappSettings');

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

    // Merge incoming settings with existing settings
    const currentSettings = user.settings || createDefaultWhatsAppSettings();
    const updatedSettings = {
      ...currentSettings,
      ...req.body
    };

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
