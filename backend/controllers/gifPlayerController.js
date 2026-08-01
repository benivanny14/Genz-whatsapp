const User = require('../models/User');

const defaultSettings = {
  gifPlayerEnabled: true,
  autoPlayGIFs: true,
  loopGIFs: true,
  gifQuality: 'high', // low, medium, high
  maxGIFSize: 10, // MB
  enableGIFAnimations: true,
  muteGIFs: false,
  gifPlaybackSpeed: 1.0,
  enableGIFControls: true,
  saveGIFs: false,
  convertToVideo: false,
  gifCompression: false
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

// @desc    Get GIF player settings
// @route   GET /api/gif-player/settings
// @access  Private
exports.getGIFPlayerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get GIF player settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update GIF player settings
// @route   POST /api/gif-player/settings
// @access  Private
exports.updateGIFPlayerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings || {};
    
    user.gifPlayerSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('gifPlayerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.gifPlayerSettings });
  } catch (error) {
    console.error('Update GIF player settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle GIF player
// @route   POST /api/gif-player/toggle
// @access  Private
exports.toggleGIFPlayer = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings || {};
    
    user.gifPlayerSettings = mergeSettings({
      ...existing,
      gifPlayerEnabled: enabled !== undefined ? enabled : !existing.gifPlayerEnabled
    });
    user.markModified('gifPlayerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.gifPlayerSettings });
  } catch (error) {
    console.error('Toggle GIF player error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle auto-play GIFs
// @route   POST /api/gif-player/auto-play
// @access  Private
exports.toggleAutoPlayGIFs = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings || {};
    
    user.gifPlayerSettings = mergeSettings({
      ...existing,
      autoPlayGIFs: enabled !== undefined ? enabled : !existing.autoPlayGIFs
    });
    user.markModified('gifPlayerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.gifPlayerSettings });
  } catch (error) {
    console.error('Toggle auto-play GIFs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update GIF quality
// @route   POST /api/gif-player/quality
// @access  Private
exports.updateGIFQuality = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { quality } = req.body;
    if (!['low', 'medium', 'high'].includes(quality)) {
      return res.status(400).json({ success: false, message: 'Invalid quality level' });
    }

    const existing = user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings || {};
    user.gifPlayerSettings = mergeSettings({
      ...existing,
      gifQuality: quality
    });
    user.markModified('gifPlayerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.gifPlayerSettings });
  } catch (error) {
    console.error('Update GIF quality error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update GIF playback speed
// @route   POST /api/gif-player/playback-speed
// @access  Private
exports.updateGIFPlaybackSpeed = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { speed } = req.body;
    if (speed && (speed < 0.25 || speed > 2.0)) {
      return res.status(400).json({ success: false, message: 'Playback speed must be between 0.25 and 2.0' });
    }

    const existing = user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings || {};
    user.gifPlayerSettings = mergeSettings({
      ...existing,
      gifPlaybackSpeed: speed !== undefined ? speed : existing.gifPlaybackSpeed
    });
    user.markModified('gifPlayerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.gifPlayerSettings });
  } catch (error) {
    console.error('Update GIF playback speed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get saved GIFs
// @route   GET /api/gif-player/saved
// @access  Private
exports.getSavedGIFs = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const saved = user.savedGIFs || [];
    res.status(200).json({ success: true, savedGIFs: saved });
  } catch (error) {
    console.error('Get saved GIFs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save GIF
// @route   POST /api/gif-player/save
// @access  Private
exports.saveGIF = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { gifUrl, name, thumbnail } = req.body;

    if (!gifUrl) {
      return res.status(400).json({ success: false, message: 'GIF URL is required' });
    }

    const settings = mergeSettings(user.gifPlayerSettings?.toObject?.() || user.gifPlayerSettings);
    
    if (!settings.saveGIFs) {
      return res.status(403).json({ success: false, message: 'GIF saving is disabled' });
    }

    const savedGIF = {
      _id: new (require('mongoose').Types.ObjectId)(),
      gifUrl,
      name: name || 'Untitled GIF',
      thumbnail: thumbnail || null,
      savedAt: new Date()
    };

    if (!user.savedGIFs) user.savedGIFs = [];
    user.savedGIFs.push(savedGIF);
    user.markModified('savedGIFs');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'GIF saved successfully',
      savedGIFId: savedGIF._id
    });
  } catch (error) {
    console.error('Save GIF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete saved GIF
// @route   DELETE /api/gif-player/saved/:id
// @access  Private
exports.deleteSavedGIF = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    if (!user.savedGIFs) {
      return res.status(404).json({ success: false, message: 'No saved GIFs found' });
    }

    const gifIndex = user.savedGIFs.findIndex(g => g._id.toString() === id);
    if (gifIndex === -1) {
      return res.status(404).json({ success: false, message: 'GIF not found' });
    }

    user.savedGIFs.splice(gifIndex, 1);
    user.markModified('savedGIFs');
    await user.save();

    res.status(200).json({ success: true, message: 'GIF deleted' });
  } catch (error) {
    console.error('Delete saved GIF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset GIF player settings to default
// @route   POST /api/gif-player/reset
// @access  Private
exports.resetGIFPlayerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.gifPlayerSettings = mergeSettings({});
    user.markModified('gifPlayerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.gifPlayerSettings });
  } catch (error) {
    console.error('Reset GIF player settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
