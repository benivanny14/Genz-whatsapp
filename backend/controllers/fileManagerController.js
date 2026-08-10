
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  fileManagerEnabled: true,
  autoOrganize: false,
  organizeByDate: true,
  organizeByType: true,
  organizeByConversation: false,
  maxFileSize: 100, // MB
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar'],
  enableFileSearch: true,
  enableFilePreview: true,
  autoDeleteOldFiles: false,
  fileRetentionDays: 30,
  enableFileSharing: true,
  enableFileEncryption: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get file manager settings
// @route   GET /api/file-manager/settings
// @access  Private
exports.getFileManagerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.fileManagerSettings?.toObject?.() || user.fileManagerSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get file manager settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update file manager settings
// @route   POST /api/file-manager/settings
// @access  Private
exports.updateFileManagerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.fileManagerSettings?.toObject?.() || user.fileManagerSettings || {};
    
    user.fileManagerSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('fileManagerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.fileManagerSettings });
  } catch (error) {
    console.error('Update file manager settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user files
// @route   GET /api/file-manager/files
// @access  Private
exports.getUserFiles = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { type, conversationId, search, limit = 50, offset = 0 } = req.query;

    const conversations = await Conversation.find({
      participants: user._id,
      ...(conversationId ? { _id: conversationId } : {})
    });

    const conversationIds = conversations.map(c => c._id);

    const filter = {
      conversationId: { $in: conversationIds },
      mediaUrl: { $exists: true }
    };

    if (type) {
      filter.messageType = type;
    }

    if (search) {
      filter.content = { $regex: search, $options: 'i' };
    }

    const messages = await Message.find(filter)
      .populate('conversationId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Message.countDocuments(filter);

    const files = messages.map(msg => ({
      id: msg._id,
      name: msg.content || 'Unnamed file',
      type: msg.messageType,
      url: msg.mediaUrl,
      conversationId: msg.conversationId._id,
      conversationName: msg.conversationId.name,
      size: msg.fileSize || 0,
      createdAt: msg.createdAt
    }));

    res.status(200).json({ success: true, files, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get files by type
// @route   GET /api/file-manager/files/:type
// @access  Private
exports.getFilesByType = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { type } = req.params;
    const { limit = 50 } = req.query;

    const conversations = await Conversation.find({ participants: user._id });
    const conversationIds = conversations.map(c => c._id);

    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      messageType: type,
      mediaUrl: { $exists: true }
    })
      .populate('conversationId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const files = messages.map(msg => ({
      id: msg._id,
      name: msg.content || 'Unnamed file',
      type: msg.messageType,
      url: msg.mediaUrl,
      conversationId: msg.conversationId._id,
      conversationName: msg.conversationId.name,
      createdAt: msg.createdAt
    }));

    res.status(200).json({ success: true, files, type });
  } catch (error) {
    console.error('Get files by type error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get file statistics
// @route   GET /api/file-manager/stats
// @access  Private
exports.getFileStats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const conversations = await Conversation.find({ participants: user._id });
    const conversationIds = conversations.map(c => c._id);

    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      mediaUrl: { $exists: true }
    });

    const stats = {
      totalFiles: messages.length,
      byType: {},
      byConversation: {},
      totalSize: 0
    };

    messages.forEach(msg => {
      // Count by type
      stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
      
      // Count by conversation
      const convId = msg.conversationId.toString();
      stats.byConversation[convId] = (stats.byConversation[convId] || 0) + 1;
      
      // Add size (estimated)
      stats.totalSize += msg.fileSize || 0;
    });

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete file
// @route   DELETE /api/file-manager/file/:id
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this file' });
    }

    // Remove media URL (in real implementation, delete from storage)
    message.mediaUrl = null;
    message.fileSize = 0;
    await message.save();

    res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Share file
// @route   POST /api/file-manager/share/:id
// @access  Private
exports.shareFile = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { conversationIds } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const settings = mergeSettings(user.fileManagerSettings?.toObject?.() || user.fileManagerSettings);
    
    if (!settings.enableFileSharing) {
      return res.status(403).json({ success: false, message: 'File sharing is disabled' });
    }

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Conversation IDs are required' });
    }

    const results = [];
    const errors = [];

    for (const convId of conversationIds) {
      try {
        const conversation = await Conversation.findById(convId);
        if (!conversation || !conversation.participants.some((p) => String(p) === String(user._id))) {
          errors.push({ conversationId: convId, error: 'Not a participant' });
          continue;
        }

        const sharedMessage = await Message.create({
          conversationId: convId,
          sender: user._id,
          content: message.content,
          messageType: message.messageType,
          mediaUrl: message.mediaUrl,
          fileSize: message.fileSize,
          sharedFrom: message._id
        });

        results.push({ conversationId: convId, messageId: sharedMessage._id });
      } catch (err) {
        errors.push({ conversationId: convId, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      shared: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Share file error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle file manager
// @route   POST /api/file-manager/toggle
// @access  Private
exports.toggleFileManager = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.fileManagerSettings?.toObject?.() || user.fileManagerSettings || {};
    
    user.fileManagerSettings = mergeSettings({
      ...existing,
      fileManagerEnabled: enabled !== undefined ? enabled : !existing.fileManagerEnabled
    });
    user.markModified('fileManagerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.fileManagerSettings });
  } catch (error) {
    console.error('Toggle file manager error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset file manager settings to default
// @route   POST /api/file-manager/reset
// @access  Private
exports.resetFileManagerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.fileManagerSettings = mergeSettings({});
    user.markModified('fileManagerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.fileManagerSettings });
  } catch (error) {
    console.error('Reset file manager settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

