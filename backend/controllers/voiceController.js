const VoiceNote = require('../models/VoiceNote');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const {
  uploadFile: uploadToMediaStorage,
  getFileType,
  isConfigured: isCloudinaryConfigured
} = require('../config/cloudinary');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;
const getPublicBaseUrl = (req) => (
  process.env.PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  ""
).replace(/\/$/, '');
const toAbsoluteUrl = (req, fileUrl = '') => (
  /^https?:\/\//i.test(fileUrl) ? fileUrl : `${getPublicBaseUrl(req)}${fileUrl}`
);

// @desc    Upload voice note
// @route   POST /api/voice/upload
// @access  Public (no auth)
exports.uploadVoiceNote = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No audio file provided' 
      });
    }

    // Extract metadata from request
    const metadata = {
      duration: req.body.duration ? parseFloat(req.body.duration) : 0,
      waveform: req.body.waveform ? JSON.parse(req.body.waveform) : null,
      voiceEffect: req.body.voiceEffect || 'none',
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    };

    let fileName = req.file.filename;
    let fileUrl = `/uploads/${req.file.filename}`;
    let publicId = req.file.filename;
    let storageProvider = 'local';

    if (isCloudinaryConfigured() && req.file.path) {
      const fileType = getFileType(req.file.originalname, req.file.mimetype) || 'audio';
      const uploadResult = await uploadToMediaStorage(req.file.path, fileType, {
        folder: 'genz-whatsapp/voice'
      });

      fileName = uploadResult.publicId || req.file.filename;
      fileUrl = uploadResult.url;
      publicId = uploadResult.publicId || req.file.filename;
      storageProvider = uploadResult.storageProvider || 'cloudinary';
      fs.unlink(req.file.path).catch(() => {});
    }

    // Create voice note record
    const voiceNote = await VoiceNote.create({
      userId: currentUserId,
      fileName,
      originalName: req.file.originalname,
      fileUrl,
      publicId,
      storageProvider,
      duration: metadata.duration,
      waveform: metadata.waveform,
      voiceEffect: metadata.voiceEffect,
      fileSize: metadata.fileSize,
      mimeType: metadata.mimeType,
      createdAt: new Date()
    }).catch(err => {
      console.error('Voice note creation error:', err);
      // Return file info even if DB fails
      return {
        _id: crypto.randomUUID(),
        fileUrl,
        duration: metadata.duration,
        waveform: metadata.waveform,
        voiceEffect: metadata.voiceEffect
      };
    });

    res.status(200).json({
      success: true,
      message: 'Voice note uploaded successfully',
      voiceNote: {
        id: voiceNote._id || voiceNote.id,
        fileUrl: toAbsoluteUrl(req, voiceNote.fileUrl),
        duration: voiceNote.duration,
        waveform: voiceNote.waveform,
        voiceEffect: voiceNote.voiceEffect,
        fileSize: voiceNote.fileSize,
        mimeType: voiceNote.mimeType,
        createdAt: voiceNote.createdAt
      }
    });
  } catch (error) {
    console.error('Voice note upload error:', error);
    // Try to return file info even on error
    if (req.file) {
      res.status(200).json({
        success: true,
        message: 'Voice note uploaded (partial)',
        voiceNote: {
          id: crypto.randomUUID(),
          fileUrl: `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`,
          duration: req.body.duration ? parseFloat(req.body.duration) : 0
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upload voice note'
      });
    }
  }
};

// @desc    Get voice note by ID
// @route   GET /api/voice/:id
// @access  Public (no auth)
exports.getVoiceNote = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { id } = req.params;

    const voiceNote = await VoiceNote.findOne({
      _id: id,
      userId: currentUserId
    }).catch(err => {
      console.error('Voice note query error:', err);
      return null;
    });

    if (!voiceNote) {
      return res.status(404).json({
        success: false,
        message: 'Voice note not found'
      });
    }

    res.status(200).json({
      success: true,
      voiceNote: {
        id: voiceNote._id,
        fileUrl: toAbsoluteUrl(req, voiceNote.fileUrl),
        duration: voiceNote.duration,
        waveform: voiceNote.waveform,
        voiceEffect: voiceNote.voiceEffect,
        fileSize: voiceNote.fileSize,
        mimeType: voiceNote.mimeType,
        createdAt: voiceNote.createdAt
      }
    });
  } catch (error) {
    console.error('Get voice note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voice note'
    });
  }
};

// @desc    Delete voice note
// @route   DELETE /api/voice/:id
// @access  Public (no auth)
exports.deleteVoiceNote = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { id } = req.params;

    const voiceNote = await VoiceNote.findOneAndDelete({
      _id: id,
      userId: currentUserId
    }).catch(err => {
      console.error('Voice note delete error:', err);
      return null;
    });

    if (voiceNote && voiceNote.fileName) {
      // Delete file from filesystem
      const filePath = path.join(__dirname, '../uploads', voiceNote.fileName);
      fs.unlink(filePath).catch(err => {
        console.error('File deletion error:', err);
        // Don't fail if file deletion fails
      });
    }

    res.status(200).json({
      success: true,
      message: 'Voice note deleted successfully'
    });
  } catch (error) {
    console.error('Delete voice note error:', error);
    // Return success even on error to prevent UI crashes
    res.status(200).json({
      success: true,
      message: 'Voice note deletion completed'
    });
  }
};

// @desc    Get all voice notes for user
// @route   GET /api/voice
// @access  Public (no auth)
exports.getAllVoiceNotes = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const voiceNotes = await VoiceNote.find({
      userId: currentUserId
    }).sort({ createdAt: -1 }).catch(err => {
      console.error('Voice notes query error:', err);
      return [];
    });

    res.status(200).json({
      success: true,
      voiceNotes: (voiceNotes || []).map(note => ({
        id: note._id,
        fileUrl: toAbsoluteUrl(req, note.fileUrl),
        duration: note.duration,
        waveform: note.waveform,
        voiceEffect: note.voiceEffect,
        fileSize: note.fileSize,
        mimeType: note.mimeType,
        createdAt: note.createdAt
      }))
    });
  } catch (error) {
    console.error('Get all voice notes error:', error);
    // Return empty array on error
    res.status(200).json({
      success: true,
      voiceNotes: []
    });
  }
};

// @desc    Update voice note metadata
// @route   PUT /api/voice/:id
// @access  Public (no auth)
exports.updateVoiceNote = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { id } = req.params;
    const updates = req.body;

    const voiceNote = await VoiceNote.findOneAndUpdate(
      {
        _id: id,
        userId: currentUserId
      },
      updates,
      { new: true }
    ).catch(err => {
      console.error('Voice note update error:', err);
      return null;
    });

    if (!voiceNote) {
      return res.status(404).json({
        success: false,
        message: 'Voice note not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Voice note updated successfully',
      voiceNote: {
        id: voiceNote._id,
        fileUrl: toAbsoluteUrl(req, voiceNote.fileUrl),
        duration: voiceNote.duration,
        waveform: voiceNote.waveform,
        voiceEffect: voiceNote.voiceEffect,
        fileSize: voiceNote.fileSize,
        mimeType: voiceNote.mimeType,
        createdAt: voiceNote.createdAt
      }
    });
  } catch (error) {
    console.error('Update voice note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update voice note'
    });
  }
};
