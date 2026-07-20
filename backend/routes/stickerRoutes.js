const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPacks,
  downloadPack,
  removePack,
  toggleFavorite,
  getMyStickers
} = require('../controllers/stickerController');

router.use(protect);

router.get('/packs', getPacks);
router.post('/packs/:packId/download', downloadPack);
router.delete('/packs/:packId', removePack);
router.post('/favorites/:stickerId', toggleFavorite);
router.get('/me', getMyStickers);

module.exports = router;
