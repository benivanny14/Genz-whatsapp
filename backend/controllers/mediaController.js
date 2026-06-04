const { 
  deleteFile, 
  deleteFiles, 
  getFileInfo, 
  listResources,
  generateSignedUrl,
  transformImage,
  getVideoThumbnail,
  isConfigured: isCloudinaryConfigured,
  uploadFile: uploadToMediaStorage,
  getFileType
} = require('../config/cloudinary');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Status = require('../models/Status');
const fs = require('fs');
const path = require('path');
const { signLocalUrlIfNeeded, buildSignedUploadPath } = require('../utils/mediaAccess');
const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');

/**
 * Media Controller
 * Handles all media operations using Cloudinary storage
 */

const getPublicBaseUrl = (req) => resolvePublicBaseUrl(req);

const normalizeUploadedFile = (req, file, uploadResult = null) => {
  if (uploadResult?.url) {
    return {
      success: true,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId || file.filename || file.originalname,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      resourceType: uploadResult.resourceType || (file.mimetype || '').split('/')[0] || 'raw',
      format: uploadResult.format || (file.originalname || '').split('.').pop(),
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration,
      storageProvider: uploadResult.storageProvider || 'cloudinary',
      thumbnailUrl: uploadResult.thumbnailUrl || null
    };
  }

  const isCloudinaryFile = Boolean(file.secure_url);
  const localPath = file.filename ? `/uploads/${file.filename}` : '';
  const localUrl = localPath
    ? signLocalUrlIfNeeded(`${getPublicBaseUrl(req)}${localPath}`, getPublicBaseUrl(req))
    : '';

  return {
    success: true,
    fileUrl: file.secure_url || localUrl,
    publicId: file.public_id || file.filename || file.originalname,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    resourceType: file.resource_type || (file.mimetype || '').split('/')[0] || 'raw',
    format: file.format || (file.originalname || '').split('.').pop(),
    width: file.width,
    height: file.height,
    duration: file.duration,
    storageProvider: isCloudinaryFile ? 'cloudinary' : 'local',
    thumbnailUrl: file.eager && file.eager[0] ? file.eager[0].secure_url : null
  };
};

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');

const getCurrentUserId = (req) => req.user?._id?.toString() || req.user?.id?.toString();

const userCanDeleteMedia = async (userId, publicId, isAdmin) => {
  if (isAdmin) return true;
  if (!userId || !publicId) return false;

  const pattern = new RegExp(publicId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const message = await Message.findOne({
    sender: userId,
    $or: [{ mediaUrl: pattern }, { fileName: pattern }]
  }).select('_id');
  if (message) return true;

  const status = await Status.findOne({ userId, mediaUrl: pattern }).select('_id');
  if (status) return true;

  const user = await User.findOne({ _id: userId, profilePicture: pattern }).select('_id');
  return Boolean(user);
};

const addMediaReference = (value, usedPublicIds, usedLocalFiles) => {
  if (!value || typeof value !== 'string') return;

  const localMatch = value.match(/\/uploads\/(.+)$/);
  if (localMatch?.[1]) {
    usedLocalFiles.add(decodeURIComponent(localMatch[1]).replace(/\\/g, '/'));
  }

  const cloudinaryMatch = value.match(/\/upload\/(?:[^/]+\/)?(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  if (cloudinaryMatch?.[1]) {
    usedPublicIds.add(cloudinaryMatch[1]);
  }
};

const walkFiles = (dir, root = dir, files = []) => {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'chunks') continue;
      walkFiles(fullPath, root, files);
    } else if (entry.isFile()) {
      files.push({
        fullPath,
        relativePath: path.relative(root, fullPath).replace(/\\/g, '/'),
        stat: fs.statSync(fullPath)
      });
    }
  }

  return files;
};

/**
 * @desc    Upload single file
 * @route   POST /api/media/upload
 * @access  Private
 */
exports.uploadFile = async (req, res) => {
  try {
    console.log('[MediaController] Upload request received');
    console.log('[MediaController] req.file:', req.file ? 'exists' : 'missing');
    console.log('[MediaController] req.file details:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      filename: req.file.filename
    } : 'N/A');

    if (!req.file) {
      console.error('[MediaController] No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let uploadResult = null;
    if (isCloudinaryConfigured() && req.file.path && fs.existsSync(req.file.path)) {
      const fileType = getFileType(req.file.originalname, req.file.mimetype) || 'document';
      uploadResult = await uploadToMediaStorage(req.file.path, fileType, {
        folder: `genz-whatsapp/${fileType}`
      });
      fs.promises.unlink(req.file.path).catch(() => {});
    }

    const fileInfo = normalizeUploadedFile(req, req.file, uploadResult);
    console.log('[MediaController] File info:', fileInfo);

    res.status(200).json(fileInfo);
  } catch (error) {
    console.error('[MediaController] Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Upload multiple files
 * @route   POST /api/media/upload-multiple
 * @access  Private
 */
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No files uploaded' 
      });
    }

    const files = req.files.map(file => normalizeUploadedFile(req, file));

    res.status(200).json({ 
      success: true,
      files,
      count: files.length
    });
  } catch (error) {
    console.error('[MediaController] Multiple upload error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Delete file from Cloudinary
 * @route   DELETE /api/media/:publicId
 * @access  Private
 */
exports.deleteFile = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;
    const userId = getCurrentUserId(req);
    const isAdmin = Boolean(req.isAdmin);

    if (!publicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Public ID is required' 
      });
    }

    if (!isAdmin && !(await userCanDeleteMedia(userId, publicId, false))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file'
      });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary is not configured; local uploads are served from /uploads and deleted with local cleanup jobs.'
      });
    }

    const result = await deleteFile(publicId, resourceType);

    res.status(200).json(result);
  } catch (error) {
    console.error('[MediaController] Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Delete multiple files from Cloudinary
 * @route   DELETE /api/media/batch
 * @access  Private
 */
exports.deleteFiles = async (req, res) => {
  try {
    const { publicIds, resourceType = 'image' } = req.body;
    const userId = getCurrentUserId(req);
    const isAdmin = Boolean(req.isAdmin);

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Public IDs array is required' 
      });
    }

    if (!isAdmin) {
      for (const id of publicIds) {
        if (!(await userCanDeleteMedia(userId, id, false))) {
          return res.status(403).json({
            success: false,
            message: `Not authorized to delete file: ${id}`
          });
        }
      }
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary is not configured; batch cloud deletion is unavailable.'
      });
    }

    const result = await deleteFiles(publicIds, resourceType);

    res.status(200).json(result);
  } catch (error) {
    console.error('[MediaController] Batch delete error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Get file info from Cloudinary
 * @route   GET /api/media/:publicId/info
 * @access  Private
 */
exports.getFileInfo = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Public ID is required' 
      });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary is not configured; local file metadata is available in upload responses.'
      });
    }

    const info = await getFileInfo(publicId, resourceType);

    res.status(200).json(info);
  } catch (error) {
    console.error('[MediaController] Get info error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Generate signed URL for private files
 * @route   GET /api/media/:publicId/signed-url
 * @access  Private
 */
exports.generateSignedUrl = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { expiresIn = 3600 } = req.query;

    if (!publicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Public ID is required' 
      });
    }

    if (!isCloudinaryConfigured()) {
      const relative = publicId.includes('/') ? publicId : publicId;
      const signedPath = buildSignedUploadPath(relative, parseInt(expiresIn, 10) || 3600);
      return res.status(200).json({
        success: true,
        signedUrl: signLocalUrlIfNeeded(`${getPublicBaseUrl(req)}${signedPath}`, getPublicBaseUrl(req)),
        expiresIn: parseInt(expiresIn, 10) || 3600
      });
    }

    const signedUrl = await generateSignedUrl(publicId, parseInt(expiresIn));

    res.status(200).json({
      success: true,
      signedUrl,
      expiresIn: parseInt(expiresIn)
    });
  } catch (error) {
    console.error('[MediaController] Signed URL error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Sign a local /uploads path for authenticated clients
 * @route   GET /api/media/sign-local
 * @access  Private
 */
exports.signLocalMedia = async (req, res) => {
  try {
    const rawPath = req.query.path;
    if (!rawPath || typeof rawPath !== 'string') {
      return res.status(400).json({ success: false, message: 'path query parameter is required' });
    }

    if (!rawPath.includes('/uploads/')) {
      return res.status(400).json({ success: false, message: 'Only /uploads paths can be signed' });
    }

    const signedUrl = signLocalUrlIfNeeded(rawPath, getPublicBaseUrl(req));
    return res.status(200).json({ success: true, url: signedUrl });
  } catch (error) {
    console.error('[MediaController] signLocalMedia error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Transform image with Cloudinary
 * @route   GET /api/media/:publicId/transform
 * @access  Private
 */
exports.transformImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    const transformations = req.query;

    if (!publicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Public ID is required' 
      });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary transformations require Cloudinary configuration.'
      });
    }

    const transformedUrl = transformImage(publicId, transformations);

    res.status(200).json({
      success: true,
      transformedUrl
    });
  } catch (error) {
    console.error('[MediaController] Transform error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Get video thumbnail URL
 * @route   GET /api/media/:publicId/thumbnail
 * @access  Private
 */
exports.getVideoThumbnail = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Public ID is required' 
      });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary thumbnails require Cloudinary configuration.'
      });
    }

    const thumbnailUrl = getVideoThumbnail(publicId);

    res.status(200).json({
      success: true,
      thumbnailUrl
    });
  } catch (error) {
    console.error('[MediaController] Thumbnail error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * @desc    Clean up orphaned media files
 * @route   DELETE /api/media/cleanup
 * @access  Private (Admin only)
 */
exports.cleanupOrphanedFiles = async (req, res) => {
  try {
    const dryRun = req.query.dryRun !== 'false';
    const minAgeHours = Number(req.query.minAgeHours || 24);
    const minAgeMs = Math.max(minAgeHours, 0) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - minAgeMs;
    const usedPublicIds = new Set();
    const usedLocalFiles = new Set();

    const messages = await Message.find({}, 'media mediaUrl fileName');
    
    messages.forEach(msg => {
      addMediaReference(msg.mediaUrl, usedPublicIds, usedLocalFiles);
      addMediaReference(msg.fileName, usedPublicIds, usedLocalFiles);

      if (msg.media) {
        if (Array.isArray(msg.media)) {
          msg.media.forEach(m => {
            if (m.publicId) usedPublicIds.add(m.publicId);
            addMediaReference(m.url || m.mediaUrl || m.fileUrl, usedPublicIds, usedLocalFiles);
          });
        } else if (msg.media.publicId) {
          usedPublicIds.add(msg.media.publicId);
          addMediaReference(msg.media.url || msg.media.mediaUrl || msg.media.fileUrl, usedPublicIds, usedLocalFiles);
        }
      }
    });

    const [conversations, statuses] = await Promise.all([
      Conversation.find({}, 'groupImage groupPhoto'),
      Status.find({}, 'mediaUrl')
    ]);
    
    conversations.forEach(conv => {
      if (conv.groupImage?.publicId) {
        usedPublicIds.add(conv.groupImage.publicId);
      }
      addMediaReference(conv.groupImage?.url || conv.groupImage?.mediaUrl, usedPublicIds, usedLocalFiles);
      addMediaReference(conv.groupPhoto, usedPublicIds, usedLocalFiles);
    });

    statuses.forEach(status => {
      addMediaReference(status.mediaUrl, usedPublicIds, usedLocalFiles);
    });

    const cleanupResult = {
      dryRun,
      minAgeHours,
      cloudinary: {
        configured: isCloudinaryConfigured(),
        scanned: 0,
        orphaned: [],
        deleted: {}
      },
      local: {
        scanned: 0,
        orphaned: [],
        deleted: []
      }
    };

    if (isCloudinaryConfigured()) {
      const resourceTypes = ['image', 'video', 'raw'];
      const resources = [];

      for (const resourceType of resourceTypes) {
        const result = await listResources({
          resourceType,
          prefix: req.query.prefix || 'genz-whatsapp',
          maxResults: Number(req.query.maxResults || 500)
        });
        resources.push(...result.resources);
      }

      const orphanedResources = resources.filter(resource => !usedPublicIds.has(resource.publicId));
      cleanupResult.cloudinary.scanned = resources.length;
      cleanupResult.cloudinary.orphaned = orphanedResources.map(resource => ({
        publicId: resource.publicId,
        resourceType: resource.resourceType,
        bytes: resource.bytes,
        createdAt: resource.createdAt
      }));

      if (!dryRun) {
        for (const resourceType of resourceTypes) {
          const publicIds = orphanedResources
            .filter(resource => resource.resourceType === resourceType)
            .map(resource => resource.publicId);

          if (publicIds.length > 0) {
            cleanupResult.cloudinary.deleted[resourceType] = await deleteFiles(publicIds, resourceType);
          }
        }
      }
    }

    const localFiles = walkFiles(UPLOAD_ROOT);
    const orphanedLocalFiles = localFiles.filter(file => (
      file.stat.mtimeMs <= cutoffTime &&
      !usedLocalFiles.has(file.relativePath) &&
      !usedLocalFiles.has(path.basename(file.relativePath))
    ));

    cleanupResult.local.scanned = localFiles.length;
    cleanupResult.local.orphaned = orphanedLocalFiles.map(file => ({
      path: file.relativePath,
      bytes: file.stat.size,
      modifiedAt: file.stat.mtime
    }));

    if (!dryRun) {
      for (const file of orphanedLocalFiles) {
        await fs.promises.unlink(file.fullPath);
        cleanupResult.local.deleted.push(file.relativePath);
      }
    }
    
    res.status(200).json({
      success: true,
      message: dryRun
        ? 'Cleanup dry-run completed. Pass dryRun=false to delete orphaned files.'
        : 'Cleanup completed',
      stats: {
        usedCloudinaryPublicIds: usedPublicIds.size,
        usedLocalFiles: usedLocalFiles.size,
        cloudinaryOrphans: cleanupResult.cloudinary.orphaned.length,
        localOrphans: cleanupResult.local.orphaned.length
      },
      cleanup: cleanupResult
    });
  } catch (error) {
    console.error('[MediaController] Cleanup error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
