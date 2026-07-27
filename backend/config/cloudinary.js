const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Cloudinary Configuration
 * Handles media upload, storage, and CDN delivery
 */

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const isConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * File size limits in bytes
 */
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 20 * 1024 * 1024, // 20MB
  document: 20 * 1024 * 1024 // 20MB
};

/**
 * Allowed file types
 */
const ALLOWED_TYPES = {
  // SVG uploads are intentionally excluded because browser-rendered SVG can
  // carry scriptable content. Use raster image formats for user uploads.
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
};

const MIME_PREFIXES = {
  image: ['image/'],
  video: ['video/'],
  audio: ['audio/'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-',
    'text/plain'
  ]
};

/**
 * Get file type from extension
 * @param {string} filename - File name
 * @returns {string|null} File type or null if invalid
 */
const getFileType = (filename, mimetype = '') => {
  const ext = path.extname(filename).toLowerCase().slice(1);
  const mimeType = String(mimetype || '').toLowerCase();

  if (mimeType) {
    for (const [type, extensions] of Object.entries(ALLOWED_TYPES)) {
      const allowedMimePrefixes = MIME_PREFIXES[type] || [];
      if (
        extensions.includes(ext) &&
        allowedMimePrefixes.some((prefix) => mimeType.startsWith(prefix))
      ) {
        return type;
      }
    }
  }
  
  for (const [type, extensions] of Object.entries(ALLOWED_TYPES)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }
  
  return null;
};

/**
 * Validate file type and size
 * @param {Object} file - File object from multer
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
const validateFile = (file) => {
  const fileType = getFileType(file.originalname, file.mimetype);
  
  if (!fileType) {
    return { valid: false, error: 'Invalid file type' };
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  const allowedMimePrefixes = MIME_PREFIXES[fileType] || [];
  if (mimeType && !allowedMimePrefixes.some((prefix) => mimeType.startsWith(prefix))) {
    return { valid: false, error: 'File MIME type does not match the file extension' };
  }
  
  const maxSize = FILE_SIZE_LIMITS[fileType];
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit for ${fileType}` 
    };
  }
  
  return { valid: true, fileType };
};

/**
 * Cloudinary storage configuration for multer
 */
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'genz-whatsapp',
    allowed_formats: [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
      'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv',
      'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'
    ],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ],
    resource_type: 'auto'
  }
});

const localStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeBase = path
      .basename(file.originalname || 'upload', ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeBase}${ext}`);
  }
});

const storage = isConfigured() ? cloudinaryStorage : (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cloudinary is required in production. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }
  console.warn('[Cloudinary] Not configured in development, using local storage. DO NOT USE IN PRODUCTION!');
  return localStorage;
})();

/**
 * Upload options for different media types
 */
const uploadOptions = {
  image: {
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1920, height: 1080, crop: 'limit' }
    ],
    eager: [
      { width: 300, height: 300, crop: 'thumb', gravity: 'face', quality: 'auto' }
    ],
    eager_async: true
  },
  video: {
    resource_type: 'video',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1280, height: 720, crop: 'limit' }
    ],
    eager: [
      { width: 320, height: 240, crop: 'limit', quality: 'auto', format: 'mp4' }
    ],
    eager_async: true
  },
  audio: {
    resource_type: 'video',
    transformation: [
      { quality: 'auto' }
    ]
  },
  document: {
    resource_type: 'raw'
  }
};

/**
 * Upload file to Cloudinary with custom options
 * @param {string} filePath - Local file path
 * @param {string} fileType - File type (image, video, audio, document)
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadFile = async (filePath, fileType, options = {}) => {
  try {
    if (!isConfigured()) {
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const fileName = path.basename(filePath);

      return {
        success: true,
        url: options.publicUrl || `/uploads/${fileName}`,
        publicId: fileName,
        resourceType: fileType,
        format: path.extname(fileName).slice(1),
        bytes: stats?.size || 0,
        storageProvider: 'local',
        thumbnailUrl: null
      };
    }

    const uploadOpts = {
      ...uploadOptions[fileType],
      ...options,
      public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const result = await cloudinary.uploader.upload(filePath, uploadOpts);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
      storageProvider: 'cloudinary',
      thumbnailUrl: result.eager && result.eager[0] ? result.eager[0].secure_url : null
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<Object>} Delete result
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('[Cloudinary] Delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @param {string} resourceType - Resource type
 * @returns {Promise<Object>} Delete result
 */
const deleteFiles = async (publicIds, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });
    
    return {
      success: true,
      deleted: result.deleted,
      failed: result.failed
    };
  } catch (error) {
    console.error('[Cloudinary] Batch delete error:', error);
    throw new Error(`Failed to delete files: ${error.message}`);
  }
};

/**
 * Get file info from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type
 * @returns {Promise<Object>} File info
 */
const getFileInfo = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('[Cloudinary] Get info error:', error);
    throw new Error(`Failed to get file info: ${error.message}`);
  }
};

/**
 * List uploaded resources from Cloudinary by prefix.
 * @param {Object} options - List options
 * @returns {Promise<Object>} Resource list
 */
const listResources = async (options = {}) => {
  const {
    resourceType = 'image',
    prefix = 'genz-whatsapp',
    maxResults = 500
  } = options;

  try {
    const resources = [];
    let nextCursor;

    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: resourceType,
        prefix,
        max_results: Math.min(maxResults - resources.length, 500),
        next_cursor: nextCursor
      });

      resources.push(...(result.resources || []));
      nextCursor = result.next_cursor;
    } while (nextCursor && resources.length < maxResults);

    return {
      success: true,
      resources: resources.map((resource) => ({
        publicId: resource.public_id,
        resourceType: resource.resource_type,
        url: resource.secure_url,
        bytes: resource.bytes,
        createdAt: resource.created_at
      }))
    };
  } catch (error) {
    console.error('[Cloudinary] List resources error:', error);
    throw new Error(`Failed to list resources: ${error.message}`);
  }
};

/**
 * Generate signed URL for private files
 * @param {string} publicId - Cloudinary public ID
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Signed URL
 */
const generateSignedUrl = async (publicId, expiresIn = 3600) => {
  try {
    const url = cloudinary.url(publicId, {
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
    
    return url;
  } catch (error) {
    console.error('[Cloudinary] Signed URL error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Transform image with Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Transformation options
 * @returns {string} Transformed URL
 */
const transformImage = (publicId, transformations = {}) => {
  const defaultTransforms = {
    quality: 'auto',
    fetch_format: 'auto'
  };
  
  return cloudinary.url(publicId, {
    ...defaultTransforms,
    ...transformations
  });
};

/**
 * Get video thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Thumbnail URL
 */
const getVideoThumbnail = (publicId) => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 320, height: 240, crop: 'limit', quality: 'auto' }
    ]
  });
};

module.exports = {
  cloudinary,
  storage,
  isConfigured,
  FILE_SIZE_LIMITS,
  ALLOWED_TYPES,
  getFileType,
  validateFile,
  uploadFile,
  deleteFile,
  deleteFiles,
  getFileInfo,
  listResources,
  generateSignedUrl,
  transformImage,
  getVideoThumbnail
};
