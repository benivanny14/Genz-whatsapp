const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { safeFilename } = require('../utils/safeFilename');
const {
  createStatus, getStatuses, viewStatus,
  reactToStatus, deleteStatus, getViewers,
  uploadStatusMedia, uploadCollageImages
} = require('../controllers/statusController');
const { editStatus } = require('../controllers/statusAdvancedController');

// Multer configuration for status uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/status/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + safeFilename(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

const collageUpload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per image
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

router.post('/', protect, createStatus);
router.get('/', protect, getStatuses);
router.put('/:id', protect, editStatus);
router.post('/upload', protect, upload.single('file'), uploadStatusMedia);
router.post('/collage-upload', protect, collageUpload.array('files', 4), uploadCollageImages);
router.post('/:id/view', protect, viewStatus);
router.post('/:id/react', protect, reactToStatus);
router.delete('/:id', protect, deleteStatus);
router.get('/:id/viewers', protect, getViewers);

module.exports = router;
