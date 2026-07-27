const User = require('../models/User');

const defaultSettings = {
  trendingStickersEnabled: true,
  autoUpdate: true,
  updateInterval: 24, // hours
  region: 'east_africa',
  language: 'en',
  maxStickers: 100,
  saveFavorites: true,
  showTrending: true,
  categories: ['trending', 'popular', 'new', 'regional']
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

// Mock trending stickers data
const mockTrendingStickers = [
  {
    _id: 'sticker1',
    name: 'Happy Dance',
    emoji: '💃',
    category: 'trending',
    region: 'east_africa',
    url: '/stickers/happy-dance.gif',
    downloads: 15000,
    createdAt: new Date()
  },
  {
    _id: 'sticker2',
    name: 'Laughing',
    emoji: '😂',
    category: 'popular',
    region: 'east_africa',
    url: '/stickers/laughing.gif',
    downloads: 12000,
    createdAt: new Date()
  },
  {
    _id: 'sticker3',
    name: 'Love',
    emoji: '❤️',
    category: 'trending',
    region: 'east_africa',
    url: '/stickers/love.gif',
    downloads: 10000,
    createdAt: new Date()
  },
  {
    _id: 'sticker4',
    name: 'Thumbs Up',
    emoji: '👍',
    category: 'popular',
    region: 'east_africa',
    url: '/stickers/thumbs-up.gif',
    downloads: 9500,
    createdAt: new Date()
  },
  {
    _id: 'sticker5',
    name: 'Fire',
    emoji: '🔥',
    category: 'new',
    region: 'east_africa',
    url: '/stickers/fire.gif',
    downloads: 8000,
    createdAt: new Date()
  }
];

// @desc    Get trending stickers settings
// @route   GET /api/trending-stickers/settings
// @access  Private
exports.getTrendingStickersSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get trending stickers settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update trending stickers settings
// @route   POST /api/trending-stickers/settings
// @access  Private
exports.updateTrendingStickersSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings || {};
    
    user.trendingStickersSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('trendingStickersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.trendingStickersSettings });
  } catch (error) {
    console.error('Update trending stickers settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get trending stickers
// @route   GET /api/trending-stickers
// @access  Private
exports.getTrendingStickers = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings);
    
    if (!settings.trendingStickersEnabled) {
      return res.status(403).json({ success: false, message: 'Trending stickers are disabled' });
    }

    const { category, limit } = req.query;
    let stickers = [...mockTrendingStickers];

    // Filter by category if specified
    if (category && settings.categories.includes(category)) {
      stickers = stickers.filter(s => s.category === category);
    }

    // Filter by region
    stickers = stickers.filter(s => s.region === settings.region);

    // Limit results
    const stickerLimit = parseInt(limit) || settings.maxStickers;
    stickers = stickers.slice(0, stickerLimit);

    res.status(200).json({ success: true, stickers });
  } catch (error) {
    console.error('Get trending stickers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get sticker by ID
// @route   GET /api/trending-stickers/:id
// @access  Private
exports.getSticker = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const sticker = mockTrendingStickers.find(s => s._id === id);

    if (!sticker) {
      return res.status(404).json({ success: false, message: 'Sticker not found' });
    }

    res.status(200).json({ success: true, sticker });
  } catch (error) {
    console.error('Get sticker error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add sticker to favorites
// @route   POST /api/trending-stickers/:id/favorite
// @access  Private
exports.addStickerToFavorites = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const sticker = mockTrendingStickers.find(s => s._id === id);

    if (!sticker) {
      return res.status(404).json({ success: false, message: 'Sticker not found' });
    }

    const settings = mergeSettings(user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings);
    
    if (!settings.saveFavorites) {
      return res.status(403).json({ success: false, message: 'Saving favorites is disabled' });
    }

    if (!user.favoriteStickers) user.favoriteStickers = [];
    
    if (!user.favoriteStickers.includes(id)) {
      user.favoriteStickers.push(id);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Sticker added to favorites' });
  } catch (error) {
    console.error('Add sticker to favorites error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove sticker from favorites
// @route   DELETE /api/trending-stickers/:id/favorite
// @access  Private
exports.removeStickerFromFavorites = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    if (!user.favoriteStickers) user.favoriteStickers = [];
    
    user.favoriteStickers = user.favoriteStickers.filter(sId => sId !== id);
    await user.save();

    res.status(200).json({ success: true, message: 'Sticker removed from favorites' });
  } catch (error) {
    console.error('Remove sticker from favorites error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get favorite stickers
// @route   GET /api/trending-stickers/favorites
// @access  Private
exports.getFavoriteStickers = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const favoriteIds = user.favoriteStickers || [];
    const stickers = mockTrendingStickers.filter(s => favoriteIds.includes(s._id));

    res.status(200).json({ success: true, stickers });
  } catch (error) {
    console.error('Get favorite stickers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search stickers
// @route   GET /api/trending-stickers/search
// @access  Private
exports.searchStickers = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const settings = mergeSettings(user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings);
    
    if (!settings.trendingStickersEnabled) {
      return res.status(403).json({ success: false, message: 'Trending stickers are disabled' });
    }

    const searchLower = query.toLowerCase();
    const stickers = mockTrendingStickers.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.category.toLowerCase().includes(searchLower) ||
      s.emoji.includes(searchLower)
    );

    res.status(200).json({ success: true, stickers });
  } catch (error) {
    console.error('Search stickers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get sticker categories
// @route   GET /api/trending-stickers/categories
// @access  Private
exports.getStickerCategories = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings);
    
    res.status(200).json({ success: true, categories: settings.categories });
  } catch (error) {
    console.error('Get sticker categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle trending stickers
// @route   POST /api/trending-stickers/toggle
// @access  Private
exports.toggleTrendingStickers = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.trendingStickersSettings?.toObject?.() || user.trendingStickersSettings || {};
    
    user.trendingStickersSettings = mergeSettings({
      ...existing,
      trendingStickersEnabled: enabled !== undefined ? enabled : !existing.trendingStickersEnabled
    });
    user.markModified('trendingStickersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.trendingStickersSettings });
  } catch (error) {
    console.error('Toggle trending stickers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset trending stickers settings to default
// @route   POST /api/trending-stickers/reset
// @access  Private
exports.resetTrendingStickersSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.trendingStickersSettings = mergeSettings({});
    user.markModified('trendingStickersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.trendingStickersSettings });
  } catch (error) {
    console.error('Reset trending stickers settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
