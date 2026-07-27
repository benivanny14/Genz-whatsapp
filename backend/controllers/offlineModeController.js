const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
  offlineModeEnabled: false,
  syncWhenOnline: true,
  cacheMessages: true,
  cacheMedia: false,
  maxCacheSize: 100, // MB
  autoDownloadOnWifi: true,
  sendWhenOnline: true,
  queueOfflineMessages: true,
  offlineNotifications: true,
  syncInterval: 5, // minutes
  prioritizeTextMessages: true
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

// @desc    Get offline mode settings
// @route   GET /api/offline-mode/settings
// @access  Private
exports.getOfflineModeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.offlineModeSettings?.toObject?.() || user.offlineModeSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get offline mode settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update offline mode settings
// @route   POST /api/offline-mode/settings
// @access  Private
exports.updateOfflineModeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.offlineModeSettings?.toObject?.() || user.offlineModeSettings || {};
    
    user.offlineModeSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('offlineModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.offlineModeSettings });
  } catch (error) {
    console.error('Update offline mode settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle offline mode
// @route   POST /api/offline-mode/toggle
// @access  Private
exports.toggleOfflineMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.offlineModeSettings?.toObject?.() || user.offlineModeSettings || {};
    
    user.offlineModeSettings = mergeSettings({
      ...existing,
      offlineModeEnabled: enabled !== undefined ? enabled : !existing.offlineModeEnabled
    });
    user.markModified('offlineModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.offlineSettings });
  } catch (error) {
    console.error('Toggle offline mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Queue offline message
// @route   POST /api/offline-mode/queue-message
// @access  Private
exports.queueOfflineMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, content, messageType, mediaUrl } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ success: false, message: 'Conversation ID and content are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const queuedMessage = {
      _id: new (require('mongoose').Types.ObjectId)(),
      conversationId,
      content,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || null,
      sender: user._id,
      queuedAt: new Date(),
      status: 'queued'
    };

    if (!user.queuedMessages) user.queuedMessages = [];
    user.queuedMessages.push(queuedMessage);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Message queued for offline sending',
      queuedMessageId: queuedMessage._id
    });
  } catch (error) {
    console.error('Queue offline message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get queued messages
// @route   GET /api/offline-mode/queued-messages
// @access  Private
exports.getQueuedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const queued = user.queuedMessages || [];
    res.status(200).json({ success: true, queued });
  } catch (error) {
    console.error('Get queued messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sync queued messages
// @route   POST /api/offline-mode/sync
// @access  Private
exports.syncQueuedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const queued = user.queuedMessages || [];
    const results = [];
    const errors = [];

    for (const queuedMsg of queued) {
      try {
        const message = await Message.create({
          conversationId: queuedMsg.conversationId,
          sender: queuedMsg.sender,
          content: queuedMsg.content,
          messageType: queuedMsg.messageType,
          mediaUrl: queuedMsg.mediaUrl,
          sentFromQueue: true
        });

        results.push({ queuedMessageId: queuedMsg._id, messageId: message._id });
      } catch (err) {
        errors.push({ queuedMessageId: queuedMsg._id, error: err.message });
      }
    }

    // Clear successfully sent messages from queue
    const successfullySentIds = results.map(r => r.queuedMessageId);
    user.queuedMessages = user.queuedMessages.filter(msg => !successfullySentIds.includes(msg._id.toString()));
    await user.save();

    res.status(200).json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors,
      remainingQueue: user.queuedMessages.length
    });
  } catch (error) {
    console.error('Sync queued messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear queued messages
// @route   DELETE /api/offline-mode/queued-messages
// @access  Private
exports.clearQueuedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const count = user.queuedMessages?.length || 0;
    user.queuedMessages = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Queued messages cleared',
      clearedCount: count
    });
  } catch (error) {
    console.error('Clear queued messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get cached messages
// @route   GET /api/offline-mode/cached-messages
// @access  Private
exports.getCachedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.query;

    const conversations = await Conversation.find({
      participants: user._id,
      ...(conversationId ? { _id: conversationId } : {})
    });

    const conversationIds = conversations.map(c => c._id);
    const messages = await Message.find({
      conversationId: { $in: conversationIds }
    })
      .populate('sender', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get cached messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update cache size limit
// @route   POST /api/offline-mode/cache-size
// @access  Private
exports.updateCacheSize = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { maxSize } = req.body;
    const existing = user.offlineModeSettings?.toObject?.() || user.offlineModeSettings || {};
    
    user.offlineModeSettings = mergeSettings({
      ...existing,
      maxCacheSize: maxSize !== undefined ? maxSize : existing.maxCacheSize
    });
    user.markModified('offlineModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.offlineModeSettings });
  } catch (error) {
    console.error('Update cache size error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get offline mode status
// @route   GET /api/offline-mode/status
// @access  Private
exports.getOfflineModeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.offlineModeSettings?.toObject?.() || user.offlineModeSettings);
    
    const status = {
      offlineModeEnabled: settings.offlineModeEnabled,
      queuedMessagesCount: user.queuedMessages?.length || 0,
      cachedMessagesCount: 0, // Would be calculated from actual cache
      cacheSize: '0 MB',
      syncWhenOnline: settings.syncWhenOnline,
      lastSyncAt: user.lastSyncAt || null
    };

    res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('Get offline mode status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset offline mode settings to default
// @route   POST /api/offline-mode/reset
// @access  Private
exports.resetOfflineModeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.offlineModeSettings = mergeSettings({});
    user.markModified('offlineModeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.offlineModeSettings });
  } catch (error) {
    console.error('Reset offline mode settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
