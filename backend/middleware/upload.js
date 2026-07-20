const multer = require('multer');
const { storage, FILE_SIZE_LIMITS, ALLOWED_TYPES, getFileType, validateFile } = require('../config/cloudinary');

/**
 * Multer middleware for file uploads using Cloudinary storage
 * Handles file validation and size limits
 */

/**
 * File filter function to validate file type and size
 * @param {Object} req - Express request
 * @param {Object} file - File object from multer
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  const validation = validateFile(file);
  
  if (!validation.valid) {
    return cb(new Error(validation.error), false);
  }
  
  cb(null, true);
};

/**
 * Create multer upload middleware with specific configuration
 * @param {string} fieldType - Field name for the file upload
 * @param {number} maxCount - Maximum number of files (default: 1)
 * @param {string} fileType - Expected file type (optional)
 * @returns {Object} Multer middleware
 */
const createUploadMiddleware = (fieldType, maxCount = 1, fileType = null) => {
  return multer({
    storage: storage,
    fileFilter: fileType ? (req, file, cb) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        return cb(new Error(validation.error), false);
      }
      if (validation.fileType !== fileType) {
        return cb(new Error(`Expected ${fileType} file, got ${validation.fileType}`), false);
      }
      cb(null, true);
    } : fileFilter,
    limits: {
      fileSize: fileType ? FILE_SIZE_LIMITS[fileType] : 100 * 1024 * 1024,
      files: maxCount
    }
  }).single(fieldType);
};

/**
 * Create multer middleware for multiple file uploads
 * @param {string} fieldType - Field name for the file upload
 * @param {number} maxCount - Maximum number of files
 * @param {string} fileType - Expected file type (optional)
 * @returns {Object} Multer middleware
 */
const createMultipleUploadMiddleware = (fieldType, maxCount = 10, fileType = null) => {
  return multer({
    storage: storage,
    fileFilter: fileType ? (req, file, cb) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        return cb(new Error(validation.error), false);
      }
      if (validation.fileType !== fileType) {
        return cb(new Error(`Expected ${fileType} file, got ${validation.fileType}`), false);
      }
      cb(null, true);
    } : fileFilter,
    limits: {
      fileSize: fileType ? FILE_SIZE_LIMITS[fileType] : 100 * 1024 * 1024,
      files: maxCount
    }
  }).array(fieldType, maxCount);
};

/**
 * Pre-configured upload middleware for different media types
 */
const uploadImage = createUploadMiddleware('image', 1, 'image');
const uploadVideo = createUploadMiddleware('video', 1, 'video');
const uploadAudio = createUploadMiddleware('audio', 1, 'audio');
const uploadDocument = createUploadMiddleware('document', 1, 'document');
const uploadMultipleImages = createMultipleUploadMiddleware('images', 10, 'image');
const uploadMultipleVideos = createMultipleUploadMiddleware('videos', 5, 'video');
const uploadMultipleDocuments = createMultipleUploadMiddleware('documents', 5, 'document');

/**
 * Generic upload middleware (accepts any supported type and flexible field names)
 */
const uploadAnyBase = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow all file types for generic upload, validation happens in cloudinary config
    console.log('[uploadAny] Processing file:', { name: file.originalname, mimetype: file.mimetype, fieldname: file.fieldname });
    cb(null, true);
  },
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10
  }
});

/**
 * Wrapper to handle multiple possible field names for file uploads
 */
const uploadAny = (req, res, next) => {
  console.log('[uploadAny] Processing request');
  
  // Create a custom handler that tries single upload with multiple field names
  const handler = uploadAnyBase.any();
  
  handler(req, res, (err) => {
    if (err) {
      console.error('[uploadAny] Error:', err);
      return next(err);
    }
    
    // If we have files, use the first one and move it to req.file
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
      console.log('[uploadAny] File processed:', { name: req.file.originalname, size: req.file.size });
    }
    
    next();
  });
};

/**
 * Error handler for upload errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const handleUploadError = (error, req, res, next) => {
  console.error('[Upload Middleware] Error:', error);
  console.error('[Upload Middleware] Error code:', error.code);
  console.error('[Upload Middleware] Error message:', error.message);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the allowed limit'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }

  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  uploadMultipleImages,
  uploadMultipleVideos,
  uploadMultipleDocuments,
  uploadAny,
  createUploadMiddleware,
  createMultipleUploadMiddleware,
  handleUploadError,
  FILE_SIZE_LIMITS,
  ALLOWED_TYPES
};
