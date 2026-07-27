const User = require('../models/User');
const { uploadFile: uploadToMediaStorage } = require('../config/cloudinary');

const defaultSettings = {
  autoCompress: true,
  compressionLevel: 'medium', // low, medium, high
  targetImageSize: 2, // MB
  targetVideoSize: 10, // MB
  targetAudioSize: 5, // MB
  preserveQuality: false,
  smartCompression: true,
  compressOnUpload: true
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

// @desc    Get media compressor settings
// @route   GET /api/media-compressor/settings
// @access  Private
exports.getCompressorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.mediaCompressorSettings?.toObject?.() || user.mediaCompressorSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get compressor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update media compressor settings
// @route   POST /api/media-compressor/settings
// @access  Private
exports.updateCompressorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaCompressorSettings?.toObject?.() || user.mediaCompressorSettings || {};
    
    user.mediaCompressorSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('mediaCompressorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaCompressorSettings });
  } catch (error) {
    console.error('Update compressor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Compress media file
// @route   POST /api/media-compressor/compress
// @access  Private
exports.compressMedia = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { fileUrl, fileType, compressionLevel } = req.body;
    
    if (!fileUrl || !fileType) {
      return res.status(400).json({ success: false, message: 'File URL and type are required' });
    }

    if (!['image', 'video', 'audio'].includes(fileType)) {
      return res.status(400).json({ success: false, message: 'Invalid file type' });
    }

    // Simulate compression (in real implementation, use sharp, ffmpeg, etc.)
    const compressionRatio = compressionLevel === 'high' ? 0.5 : compressionLevel === 'medium' ? 0.7 : 0.9;
    
    // Return compressed file URL (simulated)
    const compressedUrl = fileUrl; // In real implementation, return new compressed URL
    
    res.status(200).json({
      success: true,
      compressedUrl,
      originalSize: 100, // Would be actual size
      compressedSize: Math.round(100 * compressionRatio),
      compressionRatio: Math.round((1 - compressionRatio) * 100),
      message: 'Media compressed successfully'
    });
  } catch (error) {
    console.error('Compress media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get compression statistics
// @route   GET /api/media-compressor/stats
// @access  Private
exports.getCompressionStats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // Simulated statistics
    const stats = {
      totalCompressed: 0,
      totalSaved: 0, // MB
      averageCompression: 0,
      byType: {
        image: { count: 0, saved: 0 },
        video: { count: 0, saved: 0 },
        audio: { count: 0, saved: 0 }
      }
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Get compression stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset compressor settings to default
// @route   POST /api/media-compressor/reset
// @access  Private
exports.resetCompressorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.mediaCompressorSettings = mergeSettings({});
    user.markModified('mediaCompressorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaCompressorSettings });
  } catch (error) {
    console.error('Reset compressor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
