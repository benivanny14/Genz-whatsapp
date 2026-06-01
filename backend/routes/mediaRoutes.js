const express = require('express');
const router = express.Router();
const { uploadFile, uploadMultipleFiles } = require('../controllers/mediaController');
const { uploadAny, createMultipleUploadMiddleware, handleUploadError } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const uploadMultipleAny = createMultipleUploadMiddleware('files', 10);

router.use(protect);

router.post('/upload', uploadAny, handleUploadError, uploadFile);
router.post('/upload-multiple', uploadMultipleAny, handleUploadError, uploadMultipleFiles);

module.exports = router;
