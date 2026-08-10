/**
 * mediaToolsController.js
 * -----------------------
 * Consolidated controller for media MODs + compressor + editor
 * (proof-of-concept #2 from REFACTOR_PLAN.md — merges
 * mediaModsController.js + mediaCompressorController.js +
 * mediaEditorController.js).
 *
 * The three original controllers duplicated the same scaffolding:
 * getUser(), mergeSettings(), settings get/update handlers, and (for the
 * editor) three near-identical edit handlers. This file keeps every
 * exported handler name and route path intact — only the internal wiring
 * is shared now.
 *
 *   /api/media-mods/...      →  getMediaModsSettings, updateMediaModsSettings, toggle*
 *   /api/media-compressor/.. →  getCompressorSettings, updateCompressorSettings, compressMedia, ...
 *   /api/media-editor/...    →  getMediaEditorSettings, editImage/Video/Audio, ...
 */

const User = require('../models/User');

// ── Shared helpers (previously duplicated across all three controllers) ─────

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (defaults, settings = {}) => ({
  ...defaults,
  ...settings
});

// ── Media MODs (route prefix /api/media-mods) ───────────────────────────────

const MODS_DEFAULTS = {
  fullResolutionImages: false,
  oneGBVideoUpload: false,
  thousandPhotosBatch: false,
  autoDownloadHighRes: false,
  viewOnceBypass: false,
  saveViewOnceMedia: false,
  forwardWithoutTag: false,
  mediaForwardLimitIncrease: false
};

const getUserModsSettings = (user) =>
  mergeSettings(MODS_DEFAULTS, user.mediaModsSettings?.toObject?.() || user.mediaModsSettings);

// Generic single-field toggle — every media-mods toggle is identical apart
// from the field name and log label.
const toggleModsField = async (req, res, field, logLabel) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};
    const newValue = !existing[field];

    user.mediaModsSettings = mergeSettings(MODS_DEFAULTS, { ...existing, [field]: newValue });
    user.markModified('mediaModsSettings');
    await user.save();

    res.json({ success: true, [field]: newValue });
  } catch (error) {
    console.error(`${logLabel} error:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMediaModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    res.status(200).json({ success: true, settings: getUserModsSettings(user) });
  } catch (error) {
    console.error('Get media MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMediaModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaModsSettings?.toObject?.() || user.mediaModsSettings || {};

    user.mediaModsSettings = mergeSettings(MODS_DEFAULTS, { ...existing, ...incoming });
    user.markModified('mediaModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaModsSettings });
  } catch (error) {
    console.error('Update media MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleFullResolution = (req, res) => toggleModsField(req, res, 'fullResolutionImages', 'Toggle full resolution');
exports.toggleOneGBVideo = (req, res) => toggleModsField(req, res, 'oneGBVideoUpload', 'Toggle 1GB video');
exports.toggleThousandPhotos = (req, res) => toggleModsField(req, res, 'thousandPhotosBatch', 'Toggle 1000 photos');
exports.toggleAutoDownloadHighRes = (req, res) => toggleModsField(req, res, 'autoDownloadHighRes', 'Toggle auto download high res');
exports.toggleViewOnceBypass = (req, res) => toggleModsField(req, res, 'viewOnceBypass', 'Toggle view once bypass');
exports.toggleSaveViewOnce = (req, res) => toggleModsField(req, res, 'saveViewOnceMedia', 'Toggle save view once');
exports.toggleForwardWithoutTag = (req, res) => toggleModsField(req, res, 'forwardWithoutTag', 'Toggle forward without tag');
exports.toggleForwardLimitIncrease = (req, res) => toggleModsField(req, res, 'mediaForwardLimitIncrease', 'Toggle forward limit increase');

// ── Media compressor (route prefix /api/media-compressor) ───────────────────

const COMPRESSOR_DEFAULTS = {
  autoCompress: true,
  compressionLevel: 'medium', // low, medium, high
  targetImageSize: 2, // MB
  targetVideoSize: 10, // MB
  targetAudioSize: 5, // MB
  preserveQuality: false,
  smartCompression: true,
  compressOnUpload: true
};

exports.getCompressorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(COMPRESSOR_DEFAULTS, user.mediaCompressorSettings?.toObject?.() || user.mediaCompressorSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get compressor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCompressorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaCompressorSettings?.toObject?.() || user.mediaCompressorSettings || {};

    user.mediaCompressorSettings = mergeSettings(COMPRESSOR_DEFAULTS, { ...existing, ...incoming });
    user.markModified('mediaCompressorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaCompressorSettings });
  } catch (error) {
    console.error('Update compressor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

exports.resetCompressorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.mediaCompressorSettings = mergeSettings(COMPRESSOR_DEFAULTS, {});
    user.markModified('mediaCompressorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaCompressorSettings });
  } catch (error) {
    console.error('Reset compressor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Media editor (route prefix /api/media-editor) ───────────────────────────

const EDITOR_DEFAULTS = {
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

// Generic edit handler — editImage/editVideo/editAudio were three copies of
// the same flow differing only in the url field, enabled setting and note.
const editMedia = async (req, res, { type, enabledField, logLabel, clientNote }) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const mediaUrl = req.body[`${type}Url`];
    const edits = req.body.edits;

    if (!mediaUrl) {
      return res.status(400).json({ success: false, message: `${type[0].toUpperCase()}${type.slice(1)} URL is required` });
    }

    const settings = mergeSettings(EDITOR_DEFAULTS, user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings);

    if (!settings[enabledField]) {
      return res.status(403).json({ success: false, message: `${type[0].toUpperCase()}${type.slice(1)} editing is disabled` });
    }

    // In real implementation, use image/video/audio processing libraries
    const editResult = {
      originalUrl: mediaUrl,
      editedUrl: mediaUrl, // Would be the edited media URL
      edits: edits || {},
      processedAt: new Date()
    };

    if (settings.autoSaveEdits) {
      const editHistory = {
        _id: new (require('mongoose').Types.ObjectId)(),
        type,
        originalUrl: mediaUrl,
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

      user.markModified('editHistory');
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `${type[0].toUpperCase()}${type.slice(1)} editing requires client-side implementation`,
      note: clientNote,
      editResult
    });
  } catch (error) {
    console.error(`${logLabel} error:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMediaEditorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(EDITOR_DEFAULTS, user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get media editor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMediaEditorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings || {};

    user.mediaEditorSettings = mergeSettings(EDITOR_DEFAULTS, { ...existing, ...incoming });
    user.markModified('mediaEditorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaEditorSettings });
  } catch (error) {
    console.error('Update media editor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.editImage = (req, res) => editMedia(req, res, {
  type: 'image',
  enabledField: 'imageEditorEnabled',
  logLabel: 'Edit image',
  clientNote: 'Use client-side libraries like fabric.js or sharp for actual image editing'
});

exports.editVideo = (req, res) => editMedia(req, res, {
  type: 'video',
  enabledField: 'videoEditorEnabled',
  logLabel: 'Edit video',
  clientNote: 'Use client-side libraries like ffmpeg.wasm for actual video editing'
});

exports.editAudio = (req, res) => editMedia(req, res, {
  type: 'audio',
  enabledField: 'audioEditorEnabled',
  logLabel: 'Edit audio',
  clientNote: 'Use client-side libraries like Web Audio API for actual audio editing'
});

exports.getEditHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    res.status(200).json({ success: true, history: user.editHistory || [] });
  } catch (error) {
    console.error('Get edit history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

exports.toggleMediaEditor = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { imageEnabled, videoEnabled, audioEnabled } = req.body;
    const existing = user.mediaEditorSettings?.toObject?.() || user.mediaEditorSettings || {};

    user.mediaEditorSettings = mergeSettings(EDITOR_DEFAULTS, {
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

exports.resetMediaEditorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.mediaEditorSettings = mergeSettings(EDITOR_DEFAULTS, {});
    user.markModified('mediaEditorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.mediaEditorSettings });
  } catch (error) {
    console.error('Reset media editor settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
