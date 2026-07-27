const User = require('../models/User');

const getCurrentUserId = (req) => req.user?._id?.toString();

/**
 * Curated built-in sticker catalog.
 *
 * NOTE ON SOURCING: we cannot pull stickers directly from WhatsApp — it has
 * no public API for that, and its sticker packs are proprietary content, so
 * "importing WhatsApp's own stickers" isn't something any third-party app
 * can legitimately do. Instead this catalog uses Twemoji (Twitter's emoji
 * artwork), which Twitter/X publishes under CC-BY 4.0 specifically so any
 * app can freely use it — https://github.com/twitter/twemoji. Rendered at
 * sticker size they read exactly like WhatsApp's own emoji-style stickers,
 * are served from a stable public CDN (no API key, no rate limit issues),
 * and are 100% safe to redistribute inside GENZ.
 */
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72';

const emojiToCodepoint = (emoji) => {
  const codepoints = [];
  for (const char of emoji) {
    codepoints.push(char.codePointAt(0).toString(16));
  }
  return codepoints.join('-');
};

const stickerUrl = (emoji) => `${TWEMOJI_BASE}/${emojiToCodepoint(emoji)}.png`;

const PACK_DEFS = [
  { id: 'genz-classics', name: 'GENZ Classics', author: 'GENZ', emojis: ['😂', '🔥', '💯', '😭', '🥹', '😎', '🤙', '🫡', '👀', '🙌', '💀', '✨'] },
  { id: 'love-vibes', name: 'Love & Vibes', author: 'GENZ', emojis: ['❤️', '😍', '🥰', '💕', '💖', '😘', '🌹', '💘', '😻', '💝', '🫶', '💞'] },
  { id: 'mood-swings', name: 'Mood Swings', author: 'GENZ', emojis: ['😤', '😡', '😩', '😔', '🥲', '😴', '🙄', '😬', '🫠', '😵‍💫', '🤯', '😱'] },
  { id: 'celebration', name: 'Celebration', author: 'GENZ', emojis: ['🎉', '🎊', '🥳', '🍾', '🎂', '🏆', '🙏', '👏', '🎈', '🎁', '💪', '🚀'] },
  { id: 'animals', name: 'Cute Animals', author: 'GENZ', emojis: ['🐶', '🐱', '🐼', '🐨', '🦁', '🐸', '🐵', '🦊', '🐹', '🐰', '🐣', '🦄'] },
  { id: 'reactions', name: 'Quick Reactions', author: 'GENZ', emojis: ['👍', '👎', '🤝', '✅', '❌', '❓', '❗', '🤔', '👌', '🤐', '🫣', '🤫'] },
];

const buildCatalog = () =>
  PACK_DEFS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    author: pack.author,
    thumbnail: stickerUrl(pack.emojis[0]),
    stickers: pack.emojis.map((emoji) => ({
      id: `${pack.id}:${emojiToCodepoint(emoji)}`,
      emoji,
      url: stickerUrl(emoji)
    }))
  }));

const CATALOG = buildCatalog();

// @desc    List all available sticker packs (catalog + whether the current
//          user has already downloaded each one)
// @route   GET /api/stickers/packs
exports.getPacks = async (req, res) => {
  try {
    let downloadedIds = [];
    const userId = getCurrentUserId(req);
    if (userId) {
      const user = await User.findById(userId).select('downloadedStickerPackIds').lean();
      downloadedIds = user?.downloadedStickerPackIds || [];
    }

    const packs = CATALOG.map((pack) => ({
      ...pack,
      isDownloaded: downloadedIds.includes(pack.id)
    }));

    res.json({ success: true, packs });
  } catch (error) {
    console.error('[Stickers] getPacks error:', error);
    res.status(500).json({ success: false, message: 'Failed to load sticker packs' });
  }
};

// @desc    Download (add) a sticker pack to the current user's collection
// @route   POST /api/stickers/packs/:packId/download
exports.downloadPack = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { packId } = req.params;
    const pack = CATALOG.find((p) => p.id === packId);
    if (!pack) return res.status(404).json({ success: false, message: 'Sticker pack not found' });

    await User.findByIdAndUpdate(userId, { $addToSet: { downloadedStickerPackIds: packId } });

    res.json({ success: true, pack });
  } catch (error) {
    console.error('[Stickers] downloadPack error:', error);
    res.status(500).json({ success: false, message: 'Failed to download sticker pack' });
  }
};

// @desc    Remove a sticker pack from the current user's collection
// @route   DELETE /api/stickers/packs/:packId
exports.removePack = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { packId } = req.params;
    await User.findByIdAndUpdate(userId, { $pull: { downloadedStickerPackIds: packId } });

    res.json({ success: true });
  } catch (error) {
    console.error('[Stickers] removePack error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove sticker pack' });
  }
};

// @desc    Toggle a sticker as a favorite
// @route   POST /api/stickers/favorites/:stickerId
exports.toggleFavorite = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { stickerId } = req.params;
    const { url } = req.body || {};
    const user = await User.findById(userId).select('favoriteStickers');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const key = url || stickerId;
    const isFavorited = (user.favoriteStickers || []).includes(key);

    if (isFavorited) {
      user.favoriteStickers = user.favoriteStickers.filter((s) => s !== key);
    } else {
      user.favoriteStickers = [...(user.favoriteStickers || []), key];
    }
    await user.save();

    res.json({ success: true, isFavorited: !isFavorited, favorites: user.favoriteStickers });
  } catch (error) {
    console.error('[Stickers] toggleFavorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to update favorite sticker' });
  }
};

// @desc    Get the current user's full sticker state (downloaded packs +
//          flattened sticker list + favorites) — used to hydrate the picker
// @route   GET /api/stickers/me
exports.getMyStickers = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const user = await User.findById(userId).select('downloadedStickerPackIds favoriteStickers').lean();
    const downloadedIds = user?.downloadedStickerPackIds || [];
    const downloadedPacks = CATALOG.filter((p) => downloadedIds.includes(p.id));
    const downloadedStickers = downloadedPacks.flatMap((p) => p.stickers.map((s) => s.url));

    res.json({
      success: true,
      downloadedPackIds: downloadedIds,
      downloadedStickers,
      favoriteStickers: user?.favoriteStickers || []
    });
  } catch (error) {
    console.error('[Stickers] getMyStickers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your stickers' });
  }
};
