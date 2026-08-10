
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  cacheCleanerEnabled: true,
  autoCleanCache: false,
  cleanIntervalDays: 7,
  maxCacheSizeMB: 500,
  cleanOnLowStorage: true,
  lowStorageThreshold: 10, // percentage
  clearImageCache: true,
  clearVideoCache: true,
  clearAudioCache: true,
  clearDocumentCache: true,
  clearThumbnailCache: true,
  keepRecentDays: 30,
  clearOnAppClose: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get cache cleaner settings
// @route   GET /api/cache-cleaner/settings
// @access  Private
exports.getCacheCleanerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.cacheCleanerSettings?.toObject?.() || user.cacheCleanerSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get cache cleaner settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update cache cleaner settings
// @route   POST /api/cache-cleaner/settings
// @access  Private
exports.updateCacheCleanerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.cacheCleanerSettings?.toObject?.() || user.cacheCleanerSettings || {};
    
    user.cacheCleanerSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('cacheCleanerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.cacheCleanerSettings });
  } catch (error) {
    console.error('Update cache cleaner settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get cache size
// @route   GET /api/cache-cleaner/size
// @access  Private
exports.getCacheSize = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.cacheCleanerSettings?.toObject?.() || user.cacheCleanerSettings);
    
    const conversations = await Conversation.find({ participants: user._id });
    const conversationIds = conversations.map(c => c._id);

    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      mediaUrl: { $exists: true }
    });

    // Estimate cache size (in real implementation, calculate actual file sizes)
    const imageCount = messages.filter(m => m.messageType === 'image').length;
    const videoCount = messages.filter(m => m.messageType === 'video').length;
    const audioCount = messages.filter(m => m.messageType === 'audio').length;
    const documentCount = messages.filter(m => m.messageType === 'document').length;

    const estimatedSize = {
      images: imageCount * 2, // MB
      videos: videoCount * 5, // MB
      audio: audioCount * 1, // MB
      documents: documentCount * 0.5, // MB
      thumbnails: messages.length * 0.1, // MB
      total: 0
    };

    estimatedSize.total = estimatedSize.images + estimatedSize.videos + 
                        estimatedSize.audio + estimatedSize.documents + 
                        estimatedSize.thumbnails;

    const percentageUsed = settings.maxCacheSizeMB > 0 
      ? (estimatedSize.total / settings.maxCacheSizeMB) * 100 
      : 0;

    res.status(200).json({
      success: true,
      cacheSize: estimatedSize,
      maxCacheSize: settings.maxCacheSizeMB,
      percentageUsed: percentageUsed.toFixed(2),
      warningLevel: percentageUsed > 80 ? 'warning' : 'normal'
    });
  } catch (error) {
    console.error('Get cache size error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear cache
// @route   POST /api/cache-cleaner/clear
// @access  Private
exports.clearCache = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // SAFETY: this used to set message.mediaUrl = null directly on the
    // shared Message document, which would delete the media for EVERY
    // participant in the conversation, not just this user's own cache.
    // Disabled until it's redesigned as a per-user cache flag. Real local
    // cache clearing already works correctly client-side via
    // StorageManagement.jsx (IndexedDB), which does not touch shared data.
    return res.status(501).json({
      success: false,
      message: 'Server-side cache clearing is disabled because it would delete media for other participants too. Use Settings > Storage and data > Manage storage to clear your local cache instead.'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear old cache
// @route   POST /api/cache-cleaner/clear-old
// @access  Private
exports.clearOldCache = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    // SAFETY: same issue as clearCache — this mutated the shared Message
    // document's mediaUrl, deleting media for every participant, not just
    // this user. Disabled until redesigned as per-user. See clearCache above.
    return res.status(501).json({
      success: false,
      message: 'Server-side cache clearing is disabled because it would delete media for other participants too. Use Settings > Storage and data > Manage storage to clear your local cache instead.'
    });
  } catch (error) {
    console.error('Clear old cache error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle cache cleaner
// @route   POST /api/cache-cleaner/toggle
// @access  Private
exports.toggleCacheCleaner = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.cacheCleanerSettings?.toObject?.() || user.cacheCleanerSettings || {};
    
    user.cacheCleanerSettings = mergeSettings({
      ...existing,
      cacheCleanerEnabled: enabled !== undefined ? enabled : !existing.cacheCleanerEnabled
    });
    user.markModified('cacheCleanerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.cacheCleanerSettings });
  } catch (error) {
    console.error('Toggle cache cleaner error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set max cache size
// @route   POST /api/cache-cleaner/max-size
// @access  Private
exports.setMaxCacheSize = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { maxSizeMB } = req.body;
    const existing = user.cacheCleanerSettings?.toObject?.() || user.cacheCleanerSettings || {};
    
    user.cacheCleanerSettings = mergeSettings({
      ...existing,
      maxCacheSizeMB: maxSizeMB !== undefined ? maxSizeMB : existing.maxCacheSizeMB
    });
    user.markModified('cacheCleanerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.cacheCleanerSettings });
  } catch (error) {
    console.error('Set max cache size error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset cache cleaner settings to default
// @route   POST /api/cache-cleaner/reset
// @access  Private
exports.resetCacheCleanerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.cacheCleanerSettings = mergeSettings({});
    user.markModified('cacheCleanerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.cacheCleanerSettings });
  } catch (error) {
    console.error('Reset cache cleaner settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

