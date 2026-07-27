const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addStickerToFavorites,
  getFavoriteStickers,
  getSticker,
  getStickerCategories,
  getTrendingStickers,
  getTrendingStickersSettings,
  removeStickerFromFavorites,
  resetTrendingStickersSettings,
  searchStickers,
  toggleTrendingStickers,
  updateTrendingStickersSettings,
} = require('../controllers/trendingStickersController');

router.use(protect);

router.get('/settings', getTrendingStickersSettings);
router.post('/settings', updateTrendingStickersSettings);
router.get('/', getTrendingStickers);
router.get('/:id', getSticker);
router.post('/:id/favorite', addStickerToFavorites);
router.delete('/:id/favorite', removeStickerFromFavorites);
router.get('/favorites', getFavoriteStickers);
router.get('/search', searchStickers);
router.get('/categories', getStickerCategories);
router.post('/toggle', toggleTrendingStickers);
router.post('/reset', resetTrendingStickersSettings);

module.exports = router;
