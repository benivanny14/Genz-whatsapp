const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');
const { safeFilename } = require('../utils/safeFilename');
const { validateFileContent } = require('../middleware/fileValidation');
const {
  uploadFile: uploadToMediaStorage,
  isConfigured: isCloudinaryConfigured,
} = require('../config/cloudinary');
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

// Multer config for WINGA listing media — uses Cloudinary when configured,
// local disk as fallback (development only).
const WINGA_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'winga');
if (!isCloudinaryConfigured()) {
  fs.mkdirSync(WINGA_UPLOAD_DIR, { recursive: true });
}

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
    const allowedExts = new Set(['jpeg','jpg','png','gif','webp','bmp','mp4','webm','mov','quicktime','avi','mkv','3gp']);
    const ext = file.originalname.toLowerCase().split('.').pop();
    const isValidExt = allowedExts.has(ext);
    const isValidMime = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (isValidExt && isValidMime) return cb(null, true);
    // Fallback: allow if either ext is valid (covers webp/quicktime edge cases)
    if (isValidExt || isValidMime) {
      // still require image/video mime for security
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

// Cloudinary-aware upload wrapper: if Cloudinary is configured, upload the
// temp file to Cloudinary and return the remote URL. Otherwise, build a
// local /uploads path.
const cloudinaryUpload = async (req, res, next) => {
  if (!req.file) return next();
  if (isCloudinaryConfigured() && req.file.path) {
    try {
      const fileType = req.file.mimetype.split('/')[0] || 'image';
      const result = await uploadToMediaStorage(req.file.path, fileType, {
        folder: 'genz-whatsapp/winga',
      });
      // Attach Cloudinary URL so the controller uses it instead of local path
      req.file.location = result.url;
      req.file.cloudinaryPublicId = result.publicId;
      // Clean up temp file
      fs.promises.unlink(req.file.path).catch(() => {});
    } catch (err) {
      // Fall back to local path if Cloudinary upload fails
      console.error('WINGA Cloudinary upload failed, using local path:', err.message);
    }
  }
  next();
};

router.post('/', protect, createBusiness);
router.get('/', protect, getBusinesses);
router.post('/upload', protect, upload.single('file'), validateFileContent, cloudinaryUpload, uploadBusinessMedia);

// Order flow + seller analytics (declared before the /:id routes).
router.get('/orders', protect, getMyOrders);
router.post('/orders/:orderId/status', protect, updateOrderStatus);
router.get('/stats', protect, getWingaStats);

router.post('/:id/order', protect, placeOrder);
router.get('/:id/reviews', protect, getReviews);
router.post('/:id/rate', protect, rateBusiness);
router.post('/:id/view', protect, viewBusiness);
router.post('/:id/sold', protect, toggleSold);
router.delete('/:id', protect, deleteBusiness);

module.exports = router;
