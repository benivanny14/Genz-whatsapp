const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const stickerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'tmp')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/.(jpe?g|png|gif|webp)$/i.test(require('path').extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed for stickers'));
    }
  }
});
const { protect } = require('../middleware/auth');
const {
  getPacks,
  downloadPack,
  removePack,
  toggleFavorite,
  getMyStickers
} = require('../controllers/stickerController');

router.use(protect);

// Root GET — alias to /packs for convenience
router.get('/', getPacks);
router.get('/packs', getPacks);
router.post('/packs/:packId/download', downloadPack);
router.delete('/packs/:packId', removePack);
router.post('/favorites/:stickerId', toggleFavorite);
router.get('/me', getMyStickers);
router.post('/create', stickerUpload.single('file'), createSticker);

module.exports = router;
