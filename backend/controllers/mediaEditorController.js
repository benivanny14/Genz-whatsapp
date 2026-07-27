const User = require('../models/User');
const { uploadFile: uploadToMediaStorage } = require('../config/cloudinary');

const defaultSettings = {
  imageEditorEnabled: true,
  videoEditorEnabled: true,
  audioEditorEnabled: true,
  maxImageSize: 20, // MB
  maxVideoSize: 100, // MB
  maxAudioSize: 50, // MB
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  supportedVideoFormats: ['mp4', 'mov', 'avi', 'webm'],
  supportedAudioFormats: ['mp3', 'wav', 'aac', 'm4a'],
  autoSaveEdits: true,
  preserveOriginal: true,
  editHistoryLimit: 10
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

// @desc    Get media editor settings
// @route   GET /api/media-editor/settings
// @access  Private
exports.getMediaEditorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get media editor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update media editor settings
// @route   POST /api/media-editor/settings
// @access  Private
exports.updateMediaEditorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings || {};
    
    user.mediaEditorSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('mediaEditorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaEditorSettings });
  } catch (error) {
    console.error('Update media editor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit image (mock implementation)
// @route   POST /api/media-editor/image
// @access  Private
exports.editImage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { imageUrl, edits } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    const settings = mergeSettings(user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings);
    
    if (!settings.imageEditorEnabled) {
      return res.status(403).json({ success: false, message: 'Image editing is disabled' });
    }

    // In real implementation, use image processing libraries like sharp
    // For now, return a mock response
    const editResult = {
      originalUrl: imageUrl,
      editedUrl: imageUrl, // Would be the edited image URL
      edits: edits || {},
      processedAt: new Date()
    };

    if (settings.autoSaveEdits) {
      const editHistory = {
        _id: new (require('mongoose').Types.ObjectId)(),
        type: 'image',
        originalUrl: imageUrl,
        edits: edits || {},
        resultUrl: editResult.editedUrl,
        createdAt: new Date()
      };

      if (!user.editHistory) user.editHistory = [];
      user.editHistory.push(editHistory);
      
      // Keep only recent edits
      if (user.editHistory.length > settings.editHistoryLimit) {
        user.editHistory = user.editHistory.slice(-settings.editHistoryLimit);
      }
      
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Image editing requires client-side implementation',
      note: 'Use client-side libraries like fabric.js or sharp for actual image editing',
      editResult
    });
  } catch (error) {
    console.error('Edit image error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit video (mock implementation)
// @route   POST /api/media-editor/video
// @access  Private
exports.editVideo = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { videoUrl, edits } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: 'Video URL is required' });
    }

    const settings = mergeSettings(user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings);
    
    if (!settings.videoEditorEnabled) {
      return res.status(403).json({ success: false, message: 'Video editing is disabled' });
    }

    // In real implementation, use video processing libraries like ffmpeg
    const editResult = {
      originalUrl: videoUrl,
      editedUrl: videoUrl,
      edits: edits || {},
      processedAt: new Date()
    };

    if (settings.autoSaveEdits) {
      const editHistory = {
        _id: new (require('mongoose').Types.ObjectId)(),
        type: 'video',
        originalUrl: videoUrl,
        edits: edits || {},
        resultUrl: editResult.editedUrl,
        createdAt: new Date()
      };

      if (!user.editHistory) user.editHistory = [];
      user.editHistory.push(editHistory);
      
      if (user.editHistory.length > settings.editHistoryLimit) {
        user.editHistory = user.editHistory.slice(-settings.editHistoryLimit);
      }
      
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Video editing requires client-side implementation',
      note: 'Use client-side libraries like ffmpeg.wasm for actual video editing',
      editResult
    });
  } catch (error) {
    console.error('Edit video error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit audio (mock implementation)
// @route   POST /api/media-editor/audio
// @access  Private
exports.editAudio = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { audioUrl, edits } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ success: false, message: 'Audio URL is required' });
    }

    const settings = mergeSettings(user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings);
    
    if (!settings.audioEditorEnabled) {
      return res.status(403).json({ success: false, message: 'Audio editing is disabled' });
    }

    // In real implementation, use audio processing libraries
    const editResult = {
      originalUrl: audioUrl,
      editedUrl: audioUrl,
      edits: edits || {},
      processedAt: new Date()
    };

    if (settings.autoSaveEdits) {
      const editHistory = {
        _id: new (require('mongoose').Types.ObjectId)(),
        type: 'audio',
        originalUrl: audioUrl,
        edits: edits || {},
        resultUrl: editResult.editedUrl,
        createdAt: new Date()
      };

      if (!user.editHistory) user.editHistory = [];
      user.editHistory.push(editHistory);
      
      if (user.editHistory.length > settings.editHistoryLimit) {
        user.editHistory = user.editHistory.slice(-settings.editHistoryLimit);
      }
      
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Audio editing requires client-side implementation',
      note: 'Use client-side libraries like Web Audio API for actual audio editing',
      editResult
    });
  } catch (error) {
    console.error('Edit audio error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get edit history
// @route   GET /api/media-editor/history
// @access  Private
exports.getEditHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const history = user.editHistory || [];
    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('Get edit history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear edit history
// @route   DELETE /api/media-editor/history
// @access  Private
exports.clearEditHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.editHistory = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Edit history cleared' });
  } catch (error) {
    console.error('Clear edit history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle media editor features
// @route   POST /api/media-editor/toggle
// @access  Private
exports.toggleMediaEditor = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { imageEnabled, videoEnabled, audioEnabled } = req.body;
    const existing = user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings || {};
    
    user.mediaEditorSettings = mergeSettings({
      ...existing,
      imageEditorEnabled: imageEnabled !== undefined ? imageEnabled : existing.imageEditorEnabled,
      videoEditorEnabled: videoEnabled !== undefined ? videoEnabled : existing.videoEditorEnabled,
      audioEditorEnabled: audioEnabled !== undefined ? audioEnabled : existing.audioEditorEnabled
    });
    user.markModified('mediaEditorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaEditorSettings });
  } catch (error) {
    console.error('Toggle media editor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset media editor settings to default
// @route   POST /api/media-editor/reset
// @access  Private
exports.resetMediaEditorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.mediaEditorSettings = mergeSettings({});
    user.markModified('mediaEditorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaEditorSettings });
  } catch (error) {
    console.error('Reset media editor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
