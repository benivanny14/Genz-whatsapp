const User = require('../models/User');

const defaultSettings = {
  fullResolutionImages: false,
  oneGBVideoUpload: false,
  thousandPhotosBatch: false,
  autoDownloadHighRes: false,
  viewOnceBypass: false,
  saveViewOnceMedia: false,
  forwardWithoutTag: false,
  mediaForwardLimitIncrease: false
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

// @desc    Get media MODs settings
// @route   GET /api/media-mods/settings
// @access  Private
exports.getMediaModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.mediaModsSettings?.toObject?.() || user.mediaModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get media MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update media MODs settings
// @route   POST /api/media-mods/settings
// @access  Private
exports.updateMediaModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    
    user.mediaModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('mediaModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaModsSettings });
  } catch (error) {
    console.error('Update media MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Full Resolution Images
// @route   POST /api/media-mods/full-resolution
// @access  Private
exports.toggleFullResolution = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.fullResolutionImages;
    
    user.mediaModsSettings = mergeSettings({ ...existing, fullResolutionImages: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, fullResolutionImages: newValue });
  } catch (error) {
    console.error('Toggle full resolution error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle 1GB Video Upload
// @route   POST /api/media-mods/1gb-video
// @access  Private
exports.toggleOneGBVideo = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.oneGBVideoUpload;
    
    user.mediaModsSettings = mergeSettings({ ...existing, oneGBVideoUpload: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, oneGBVideoUpload: newValue });
  } catch (error) {
    console.error('Toggle 1GB video error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle 1000 Photos Batch
// @route   POST /api/media-mods/1000-photos
// @access  Private
exports.toggleThousandPhotos = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.thousandPhotosBatch;
    
    user.mediaModsSettings = mergeSettings({ ...existing, thousandPhotosBatch: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, thousandPhotosBatch: newValue });
  } catch (error) {
    console.error('Toggle 1000 photos error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Download High Res
// @route   POST /api/media-mods/auto-download-high-res
// @access  Private
exports.toggleAutoDownloadHighRes = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.autoDownloadHighRes;
    
    user.mediaModsSettings = mergeSettings({ ...existing, autoDownloadHighRes: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, autoDownloadHighRes: newValue });
  } catch (error) {
    console.error('Toggle auto download high res error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle View Once Bypass
// @route   POST /api/media-mods/view-once-bypass
// @access  Private
exports.toggleViewOnceBypass = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.viewOnceBypass;
    
    user.mediaModsSettings = mergeSettings({ ...existing, viewOnceBypass: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, viewOnceBypass: newValue });
  } catch (error) {
    console.error('Toggle view once bypass error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Save View Once Media
// @route   POST /api/media-mods/save-view-once
// @access  Private
exports.toggleSaveViewOnce = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.saveViewOnceMedia;
    
    user.mediaModsSettings = mergeSettings({ ...existing, saveViewOnceMedia: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, saveViewOnceMedia: newValue });
  } catch (error) {
    console.error('Toggle save view once error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Forward Without Tag
// @route   POST /api/media-mods/forward-without-tag
// @access  Private
exports.toggleForwardWithoutTag = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.forwardWithoutTag;
    
    user.mediaModsSettings = mergeSettings({ ...existing, forwardWithoutTag: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, forwardWithoutTag: newValue });
  } catch (error) {
    console.error('Toggle forward without tag error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Media Forward Limit Increase
// @route   POST /api/media-mods/forward-limit-increase
// @access  Private
exports.toggleForwardLimitIncrease = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing.mediaForwardLimitIncrease;
    
    user.mediaModsSettings = mergeSettings({ ...existing, mediaForwardLimitIncrease: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, mediaForwardLimitIncrease: newValue });
  } catch (error) {
    console.error('Toggle forward limit increase error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
