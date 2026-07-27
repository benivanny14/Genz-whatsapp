const User = require('../models/User');
const Message = require('../models/Message');

const defaultSettings = {
  linkPreviewEnabled: true,
  autoGenerate: true,
  showTitle: true,
  showDescription: true,
  showImage: true,
  showFavicon: true,
  cachePreviews: true,
  cacheDuration: 7, // days
  maxPreviewSize: 500, // KB
  specificConversations: [],
  excludeConversations: [],
  logPreviews: true
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

// Mock link preview generation
function generateMockLinkPreview(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    return {
      url,
      title: `${domain} - Website`,
      description: `Preview of content from ${domain}`,
      image: `https://via.placeholder.com/1200x630?text=${domain}`,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
      siteName: domain,
      author: 'Unknown',
      publishedAt: new Date(),
      type: 'website'
    };
  } catch (error) {
    return null;
  }
}

// @desc    Get link preview settings
// @route   GET /api/link-preview/settings
// @access  Private
exports.getLinkPreviewSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get link preview settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update link preview settings
// @route   POST /api/link-preview/settings
// @access  Private
exports.updateLinkPreviewSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings || {};
    
    user.linkPreviewSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Update link preview settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate link preview
// @route   POST /api/link-preview/generate
// @access  Private
exports.generateLinkPreview = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { url, conversationId } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const settings = mergeSettings(user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings);
    
    if (!settings.linkPreviewEnabled) {
      return res.status(403).json({ success: false, message: 'Link preview is disabled' });
    }

    // Check if this conversation should generate previews
    if (conversationId) {
      const shouldApply = settings.specificConversations.length === 0 || 
                         settings.specificConversations.includes(conversationId) ||
                         !settings.excludeConversations.includes(conversationId);

      if (!shouldApply) {
        return res.status(403).json({ success: false, message: 'Link preview is disabled for this conversation' });
      }
    }

    // Check cache if enabled
    if (settings.cachePreviews) {
      if (!user.linkPreviewCache) user.linkPreviewCache = [];
      const cachedPreview = user.linkPreviewCache.find(
        p => p.url === url && new Date(p.expiresAt) > new Date()
      );
      
      if (cachedPreview) {
        return res.status(200).json({ success: true, preview: cachedPreview, cached: true });
      }
    }

    // Generate preview (mock implementation)
    const preview = generateMockLinkPreview(url);
    
    if (!preview) {
      return res.status(400).json({ success: false, message: 'Invalid URL or unable to generate preview' });
    }

    // Apply settings
    if (!settings.showTitle) delete preview.title;
    if (!settings.showDescription) delete preview.description;
    if (!settings.showImage) delete preview.image;
    if (!settings.showFavicon) delete preview.favicon;

    // Cache preview if enabled
    if (settings.cachePreviews) {
      const cacheEntry = {
        ...preview,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + settings.cacheDuration * 24 * 60 * 60 * 1000)
      };
      
      // Remove old cache entries
      user.linkPreviewCache = user.linkPreviewCache.filter(
        p => new Date(p.expiresAt) > new Date()
      );
      
      user.linkPreviewCache.push(cacheEntry);
      
      // Limit cache size
      if (user.linkPreviewCache.length > 100) {
        user.linkPreviewCache = user.linkPreviewCache.slice(-100);
      }
    }

    // Log preview if enabled
    if (settings.logPreviews) {
      if (!user.linkPreviewLog) user.linkPreviewLog = [];
      user.linkPreviewLog.push({
        url,
        conversationId,
        timestamp: new Date()
      });
    }

    await user.save();

    res.status(200).json({ success: true, preview });
  } catch (error) {
    console.error('Generate link preview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get cached previews
// @route   GET /api/link-preview/cache
// @access  Private
exports.getCachedPreviews = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const cache = user.linkPreviewCache || [];
    const { limit } = req.query;
    
    const cacheLimit = parseInt(limit) || 50;
    const recentCache = cache.slice(-cacheLimit);

    res.status(200).json({ success: true, cache: recentCache });
  } catch (error) {
    console.error('Get cached previews error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear preview cache
// @route   DELETE /api/link-preview/cache
// @access  Private
exports.clearPreviewCache = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.linkPreviewCache = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Preview cache cleared' });
  } catch (error) {
    console.error('Clear preview cache error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get preview log
// @route   GET /api/link-preview/log
// @access  Private
exports.getPreviewLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const log = user.linkPreviewLog || [];
    const { limit } = req.query;
    
    const logLimit = parseInt(limit) || 100;
    const recentLog = log.slice(-logLimit);

    res.status(200).json({ success: true, log: recentLog });
  } catch (error) {
    console.error('Get preview log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear preview log
// @route   DELETE /api/link-preview/log
// @access  Private
exports.clearPreviewLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.linkPreviewLog = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Preview log cleared' });
  } catch (error) {
    console.error('Clear preview log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to specific list
// @route   POST /api/link-preview/conversation
// @access  Private
exports.addConversationToSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings || {};
    
    if (!existing.specificConversations) existing.specificConversations = [];
    
    if (!existing.specificConversations.includes(conversationId)) {
      existing.specificConversations.push(conversationId);
    }

    user.linkPreviewSettings = mergeSettings({ ...existing });
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Add conversation to specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from specific list
// @route   DELETE /api/link-preview/conversation/:conversationId
// @access  Private
exports.removeConversationFromSpecific = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings || {};
    
    if (existing.specificConversations) {
      existing.specificConversations = existing.specificConversations.filter(id => id !== conversationId);
    }

    user.linkPreviewSettings = mergeSettings({ ...existing });
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Remove conversation from specific error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add conversation to exclude list
// @route   POST /api/link-preview/exclude
// @access  Private
exports.addConversationToExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const existing = user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings || {};
    
    if (!existing.excludeConversations) existing.excludeConversations = [];
    
    if (!existing.excludeConversations.includes(conversationId)) {
      existing.excludeConversations.push(conversationId);
    }

    user.linkPreviewSettings = mergeSettings({ ...existing });
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Add conversation to exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove conversation from exclude list
// @route   DELETE /api/link-preview/exclude/:conversationId
// @access  Private
exports.removeConversationFromExclude = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.params;

    const existing = user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings || {};
    
    if (existing.excludeConversations) {
      existing.excludeConversations = existing.excludeConversations.filter(id => id !== conversationId);
    }

    user.linkPreviewSettings = mergeSettings({ ...existing });
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Remove conversation from exclude error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle link preview
// @route   POST /api/link-preview/toggle
// @access  Private
exports.toggleLinkPreview = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.linkPreviewSettings?.toObject?.() || user.linkPreviewSettings || {};
    
    user.linkPreviewSettings = mergeSettings({
      ...existing,
      linkPreviewEnabled: enabled !== undefined ? enabled : !existing.linkPreviewEnabled
    });
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Toggle link preview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset link preview settings to default
// @route   POST /api/link-preview/reset
// @access  Private
exports.resetLinkPreviewSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.linkPreviewSettings = mergeSettings({});
    user.markModified('linkPreviewSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.linkPreviewSettings });
  } catch (error) {
    console.error('Reset link preview settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
