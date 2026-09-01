const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const updateController = require('../controllers/updateController');
const { protect, isAdmin } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'updates');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for APK uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `genz-messenger-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.android.package-archive' || file.originalname.endsWith('.apk')) {
      cb(null, true);
    } else {
      cb(new Error('Only APK files allowed'), false);
    }
  }
});

// Public — any client can check for updates
router.get('/check', updateController.checkForUpdate);

// Admin-only — upload new version (with multer for file upload)
router.post('/upload', protect, isAdmin, upload.single('apk'), updateController.uploadUpdate);

// Admin-only — view update history
router.get('/stats', protect, isAdmin, updateController.getUpdateStats);

module.exports = router;
