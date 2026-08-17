const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');
const { safeFilename } = require('../utils/safeFilename');
const { validateFileContent } = require('../middleware/fileValidation');
const {
  createBusiness,
  getBusinesses,
  viewBusiness,
  uploadBusinessMedia,
  deleteBusiness,
  toggleSold,
  rateBusiness,
  getReviews,
  placeOrder,
  getMyOrders,
  updateOrderStatus,
  getWingaStats
} = require('../controllers/wingaController');

// Multer config for WINGA listing media (mirrors status uploads).
const WINGA_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'winga');
fs.mkdirSync(WINGA_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, WINGA_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + safeFilename(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Invalid file type'));
  }
});

router.post('/', protect, createBusiness);
router.get('/', protect, getBusinesses);
router.post('/upload', protect, upload.single('file'), validateFileContent, uploadBusinessMedia);

// Order flow + seller analytics (declared before the /:id routes).
router.get('/orders', protect, getMyOrders);
router.post('/orders/:orderId/status', protect, updateOrderStatus);
router.get('/stats', protect, getWingaStats);
router.post('/:id/order', protect, placeOrder);

router.post('/:id/view', protect, viewBusiness);
router.post('/:id/sold', protect, toggleSold);
router.post('/:id/rate', protect, rateBusiness);
router.get('/:id/reviews', protect, getReviews);
router.delete('/:id', protect, deleteBusiness);

module.exports = router;
