const User = require('../models/User');
const Message = require('../models/Message');

const defaultSettings = {
  autoSaveMediaEnabled: true,
  savePhotos: true,
  saveVideos: true,
  saveAudio: false,
  saveDocuments: false,
  saveFromContacts: true,
  saveFromGroups: false,
  saveFromBroadcasts: false,
  specificConversations: [],
  excludeConversations: [],
  quality: 'original', // original, compressed, thumbnail
  maxFileSize: 50, // MB
  autoDeleteAfter: 0, // 0 = never delete, in days
  organizeByDate: true,
  organizeBySender: false,
  logSavedMedia: true
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

// @desc    Get auto save media settings
// @route   GET /api/auto-save-media/settings
// @access  Private
exports.getAutoSaveMediaSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get auto save media settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update auto save media settings
// @route   POST /api/auto-save-media/settings
// @access  Private
exports.updateAutoSaveMediaSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings || {};
    
    user.autoSaveMediaSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Update auto save media settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save media to gallery
// @route   POST /api/auto-save-media/save
// @access  Private
exports.saveMediaToGallery = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId, conversationId } = req.body;

    if (!messageId || !conversationId) {
      return res.status(400).json({ success: false, message: 'Message ID and conversation ID are required' });
    }

    const settings = mergeSettings(user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings);
    
    if (!settings.autoSaveMediaEnabled) {
      return res.status(403).json({ success: false, message: 'Auto save media is disabled' });
    }

    // Get the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check if message has media
    if (!message.media || !message.media.url) {
      return res.status(400).json({ success: false, message: 'Message does not contain media' });
    }

    // Check media type
    const mediaType = message.media.type;
    const shouldSave = 
      (mediaType === 'image' && settings.savePhotos) ||
      (mediaType === 'video' && settings.saveVideos) ||
      (mediaType === 'audio' && settings.saveAudio) ||
      (mediaType === 'document' && settings.saveDocuments);

    if (!shouldSave) {
      return res.status(403).json({ success: false, message: 'This media type is not configured for auto-save' });
    }

    // Check file size
    const fileSizeMB = message.media.size ? message.media.size / (1024 * 1024) : 0;
    if (fileSizeMB > settings.maxFileSize) {
      return res.status(400).json({ success: false, message: `File size exceeds maximum limit of ${settings.maxFileSize}MB` });
    }

    // Check if this conversation should auto-save
    const shouldApply = settings.specificConversations.length === 0 || 
                       settings.specificConversations.includes(conversationId) ||
                       !settings.excludeConversations.includes(conversationId);

    if (!shouldApply) {
      return res.status(403).json({ success: false, message: 'Auto-save is disabled for this conversation' });
    }

    // Mock save to gallery (in real implementation, this would save to device storage)
    const savedMedia = {
      _id: new (require('mongoose').Types.ObjectId)(),
      messageId,
      conversationId,
      mediaType,
      url: message.media.url,
      fileName: message.media.fileName || `media_${Date.now()}`,
      fileSize: message.media.size,
      savedAt: new Date(),
      quality: settings.quality,
      autoDeleteAt: settings.autoDeleteAfter > 0 
        ? new Date(Date.now() + settings.autoDeleteAfter * 24 * 60 * 60 * 1000) 
        : null
    };

    if (!user.savedMedia) user.savedMedia = [];
    user.savedMedia.push(savedMedia);
    
    // Log saved media if enabled
    if (settings.logSavedMedia) {
      if (!user.savedMediaLog) user.savedMediaLog = [];
      user.savedMediaLog.push({
        messageId,
        conversationId,
        mediaType,
        timestamp: new Date()
      });
    }
    
    await user.save();

    res.status(200).json({ success: true, savedMedia });
  } catch (error) {
    console.error('Save media to gallery error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get saved media
// @route   GET /api/auto-save-media/saved
// @access  Private
exports.getSavedMedia = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { mediaType, limit } = req.query;
    let savedMedia = user.savedMedia || [];

    // Filter by media type if specified
    if (mediaType) {
      savedMedia = savedMedia.filter(m => m.mediaType === mediaType);
    }

    // Limit results
    const mediaLimit = parseInt(limit) || 50;
    savedMedia = savedMedia.slice(0, mediaLimit);

    res.status(200).json({ success: true, savedMedia });
  } catch (error) {
    console.error('Get saved media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete saved media
// @route   DELETE /api/auto-save-media/saved/:id
// @access  Private
exports.deleteSavedMedia = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const savedMedia = user.savedMedia || [];
    const index = savedMedia.findIndex(m => m._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Saved media not found' });
    }

    savedMedia.splice(index, 1);
    user.savedMedia = savedMedia;
    await user.save();

    res.status(200).json({ success: true, message: 'Saved media deleted' });
  } catch (error) {
    console.error('Delete saved media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all saved media
// @route   DELETE /api/auto-save-media/saved
// @access  Private
exports.clearSavedMedia = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.savedMedia = [];
    await user.save();

    res.status(200).json({ success: true, message: 'All saved media cleared' });
  } catch (error) {
    console.error('Clear saved media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to specific list
// @route   POST /api/auto-save-media/conversation
// @access  Private
exports.addConversationToSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings || {};
    
    if (!existing.specificConversations) existing.specificConversations = [];
    
    if (!existing.specificConversations.includes(conversationId)) {
      existing.specificConversations.push(conversationId);
    }

    user.autoSaveMediaSettings = mergeSettings({ ...existing });
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Add conversation to specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from specific list
// @route   DELETE /api/auto-save-media/conversation/:conversationId
// @access  Private
exports.removeConversationFromSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings || {};
    
    if (existing.specificConversations) {
      existing.specificConversations = existing.specificConversations.filter(id => id !== conversationId);
    }

    user.autoSaveMediaSettings = mergeSettings({ ...existing });
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Remove conversation from specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to exclude list
// @route   POST /api/auto-save-media/exclude
// @access  Private
exports.addConversationToExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings || {};
    
    if (!existing.excludeConversations) existing.excludeConversations = [];
    
    if (!existing.excludeConversations.includes(conversationId)) {
      existing.excludeConversations.push(conversationId);
    }

    user.autoSaveMediaSettings = mergeSettings({ ...existing });
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Add conversation to exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from exclude list
// @route   DELETE /api/auto-save-media/exclude/:conversationId
// @access  Private
exports.removeConversationFromExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings || {};
    
    if (existing.excludeConversations) {
      existing.excludeConversations = existing.excludeConversations.filter(id => id !== conversationId);
    }

    user.autoSaveMediaSettings = mergeSettings({ ...existing });
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Remove conversation from exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get saved media log
// @route   GET /api/auto-save-media/log
// @access  Private
exports.getSavedMediaLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const log = user.savedMediaLog || [];
    const { limit } = req.query;
    
    const logLimit = parseInt(limit) || 100;
    const recentLog = log.slice(0, logLimit);

    res.status(200).json({ success: true, log: recentLog });
  } catch (error) {
    console.error('Get saved media log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear saved media log
// @route   DELETE /api/auto-save-media/log
// @access  Private
exports.clearSavedMediaLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.savedMediaLog = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Saved media log cleared' });
  } catch (error) {
    console.error('Clear saved media log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle auto save media
// @route   POST /api/auto-save-media/toggle
// @access  Private
exports.toggleAutoSaveMedia = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.autoSaveMediaSettings?.toObject?.() || user.autoSaveMediaSettings || {};
    
    user.autoSaveMediaSettings = mergeSettings({
      ...existing,
      autoSaveMediaEnabled: enabled !== undefined ? enabled : !existing.autoSaveMediaEnabled
    });
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Toggle auto save media error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset auto save media settings to default
// @route   POST /api/auto-save-media/reset
// @access  Private
exports.resetAutoSaveMediaSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.autoSaveMediaSettings = mergeSettings({});
    user.markModified('autoSaveMediaSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.autoSaveMediaSettings });
  } catch (error) {
    console.error('Reset auto save media settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
