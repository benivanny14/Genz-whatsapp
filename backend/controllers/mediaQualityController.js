const User = require('../models/User');

const defaultSettings = {
  imageQuality: 'high', // low, medium, high, original
  videoQuality: 'high', // low, medium, high, original
  audioQuality: 'high', // low, medium, high, original
  autoCompressImages: true,
  autoCompressVideos: true,
  autoCompressAudio: true,
  maxImageSize: 10, // MB
  maxVideoSize: 100, // MB
  maxAudioSize: 25, // MB
  preserveMetadata: false,
  enableWebP: true,
  enableHEIC: false
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

// @desc    Get media quality settings
// @route   GET /api/media-quality/settings
// @access  Private
exports.getMediaQualitySettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get media quality settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update media quality settings
// @route   POST /api/media-quality/settings
// @access  Private
exports.updateMediaQualitySettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings || {};
    
    user.mediaQualitySettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Update media quality settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update image quality
// @route   POST /api/media-quality/image
// @access  Private
exports.updateImageQuality = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { quality } = req.body;
    if (!['low', 'medium', 'high', 'original'].includes(quality)) {
      return res.status(400).json({ success: false, message: 'Invalid quality level' });
    }

    const existing = user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings || {};
    user.mediaQualitySettings = mergeSettings({ ...existing, imageQuality: quality });
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Update image quality error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update video quality
// @route   POST /api/media-quality/video
// @access  Private
exports.updateVideoQuality = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { quality } = req.body;
    if (!['low', 'medium', 'high', 'original'].includes(quality)) {
      return res.status(400).json({ success: false, message: 'Invalid quality level' });
    }

    const existing = user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings || {};
    user.mediaQualitySettings = mergeSettings({ ...existing, videoQuality: quality });
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Update video quality error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update audio quality
// @route   POST /api/media-quality/audio
// @access  Private
exports.updateAudioQuality = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { quality } = req.body;
    if (!['low', 'medium', 'high', 'original'].includes(quality)) {
      return res.status(400).json({ success: false, message: 'Invalid quality level' });
    }

    const existing = user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings || {};
    user.mediaQualitySettings = mergeSettings({ ...existing, audioQuality: quality });
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Update audio quality error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update auto-compress settings
// @route   POST /api/media-quality/auto-compress
// @access  Private
exports.updateAutoCompress = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { images, videos, audio } = req.body;
    const existing = user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings || {};
    
    user.mediaQualitySettings = mergeSettings({
      ...existing,
      autoCompressImages: images !== undefined ? images : existing.autoCompressImages,
      autoCompressVideos: videos !== undefined ? videos : existing.autoCompressVideos,
      autoCompressAudio: audio !== undefined ? audio : existing.autoCompressAudio
    });
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Update auto-compress settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update max file sizes
// @route   POST /api/media-quality/max-sizes
// @access  Private
exports.updateMaxSizes = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { maxImageSize, maxVideoSize, maxAudioSize } = req.body;
    const existing = user.mediaQualitySettings?.toObject?.() || user.mediaQualitySettings || {};
    
    user.mediaQualitySettings = mergeSettings({
      ...existing,
      maxImageSize: maxImageSize !== undefined ? maxImageSize : existing.maxImageSize,
      maxVideoSize: maxVideoSize !== undefined ? maxVideoSize : existing.maxVideoSize,
      maxAudioSize: maxAudioSize !== undefined ? maxAudioSize : existing.maxAudioSize
    });
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Update max sizes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset media quality settings to default
// @route   POST /api/media-quality/reset
// @access  Private
exports.resetMediaQualitySettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.mediaQualitySettings = mergeSettings({});
    user.markModified('mediaQualitySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaQualitySettings });
  } catch (error) {
    console.error('Reset media quality settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
