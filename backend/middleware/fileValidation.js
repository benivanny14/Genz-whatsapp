const fs = require('fs');
const path = require('path');
const FileType = require('file-type');

/**
 * File Upload Security Middleware
 * 
 * Validates uploaded files by checking their "magic bytes" (file signatures)
 * to prevent attackers from disguising malicious files (e.g., .exe, .php)
 * as innocent-looking images or documents.
 * 
 * This runs AFTER multer has saved the file to disk but BEFORE
 * the file is processed or served to other users.
 */

// Allowed MIME types mapped to categories
const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/3gpp'
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/vnd.wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
    'audio/amr',
    'audio/webm;codecs=opus',
    'audio/webm;codecs=vp8',
    'video/webm'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip'
  ]
};

// Flatten all allowed MIME types into a Set for fast lookup
const ALL_ALLOWED = new Set(
  Object.values(ALLOWED_MIME_TYPES).flat()
);

// Dangerous extensions that should NEVER be served
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.ps1',
  '.psm1', '.psd1', '.sh', '.bash', '.csh', '.ksh',
  '.php', '.php3', '.php4', '.php5', '.phtml', '.asp',
  '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi', '.htaccess',
  '.dll', '.sys', '.drv', '.inf', '.reg'
]);

/**
 * Validate a file's actual content against its claimed type.
 * Removes the file from disk if it fails validation.
 * 
 * @param {Object} req - Express request object with req.file from multer
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const validateFileContent = async (req, res, next) => {
  if (!req.file) {
    console.log('[Security] No file to validate');
    return next();
  }

  const filePath = req.file.path;
  console.log('[Security] File path:', filePath);
  console.log('[Security] File exists:', fs.existsSync(filePath));

  // Skip validation if file was uploaded to Cloudinary (no local path)
  if (!filePath || !fs.existsSync(filePath)) {
    console.log('[Security] Skipping file content validation for Cloudinary upload');
    return next();
  }

  try {
    // 1. Check extension against blocklist
    const ext = path.extname(req.file.originalname || '').toLowerCase();
    console.log('[Security] File extension:', ext);
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      safeRemove(filePath);
      return res.status(400).json({
        success: false,
        message: `File type "${ext}" is not allowed for security reasons`
      });
    }

    // 2. Read magic bytes and determine real file type
    const fileBuffer = fs.readFileSync(filePath);
    const detectedType = await FileType.fromBuffer(fileBuffer);
    console.log('[Security] Detected file type:', detectedType);

    // For text-based files (txt, csv, svg), file-type returns undefined.
    // Allow them only if the claimed MIME starts with text/ or is a known doc type.
    if (!detectedType) {
      const claimedMime = (req.file.mimetype || '').toLowerCase();
      console.log('[Security] Claimed MIME:', claimedMime);
      const isTextBased = claimedMime.startsWith('text/') || claimedMime === 'application/json';
      const isAudio = claimedMime.startsWith('audio/') || claimedMime.startsWith('video/webm');
      const isImage = claimedMime.startsWith('image/');
      const isVideo = claimedMime.startsWith('video/');

      if (isTextBased) {
        // Scan for suspicious embedded content (PHP tags, script tags)
        const textContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 8192));
        if (/<\?php/i.test(textContent) || /<script/i.test(textContent)) {
          safeRemove(filePath);
          return res.status(400).json({
            success: false,
            message: 'File contains potentially malicious content'
          });
        }
        return next();
      }

      // Allow audio/video/image files even if file-type can't detect them
      // (some formats like webm audio may not have recognizable magic bytes)
      if (isAudio || isImage || isVideo) {
        console.log('[Security] Allowing media file with claimed MIME:', claimedMime);
        return next();
      }

      // Unknown binary without magic bytes — reject
      safeRemove(filePath);
      return res.status(400).json({
        success: false,
        message: 'Unable to verify file type. Upload rejected.'
      });
    }

    // 3. Verify detected MIME is in our allowlist
    console.log('[Security] Detected MIME:', detectedType.mime);
    console.log('[Security] Allowed MIMEs:', JSON.stringify(Array.from(ALL_ALLOWED)));
    console.log('[Security] Allowed HAS detected?', ALL_ALLOWED.has(detectedType.mime));
    // Defensive: also check charset/params-less version (e.g. audio/webm;codecs=opus)
    const mimeBase = (detectedType.mime || '').split(';')[0].trim();
    console.log('[Security] Detected MIME base:', mimeBase);
    // Write persistent validation info to a logfile for debugging requests
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const out = `[${new Date().toISOString()}] file:${path.basename(filePath)} detected:${detectedType.mime} base:${mimeBase} allowed:${ALL_ALLOWED.has(detectedType.mime)} ext:${detectedType.ext}\n`;
      fs.appendFileSync(path.join(logDir, 'file_validation.log'), out);
    } catch (e) {
      console.error('[Security] Failed writing validation log:', e.message);
    }
    // Special-case: some WAV files are detected as 'audio/vnd.wave' or similar
    // Accept by extension if file-type reports a WAV ext to avoid rejecting
    // common browser-recorded WAV variants.
    if (detectedType.ext === 'wav') {
      console.log('[Security] WAV detected by extension; accepting as audio');
      req.file.verifiedMime = 'audio/wav';
      req.file.verifiedExt = 'wav';
      return next();
    }

    if (!ALL_ALLOWED.has(detectedType.mime) && !ALL_ALLOWED.has(mimeBase)) {
      safeRemove(filePath);
      return res.status(400).json({
        success: false,
        message: `Detected file type "${detectedType.mime}" is not allowed`
      });
    }

    // 4. Attach the verified type info for downstream handlers
    req.file.verifiedMime = detectedType.mime;
    req.file.verifiedExt = detectedType.ext;

    return next();
  } catch (error) {
    console.error('[Security] File validation error:', error.message);
    safeRemove(filePath);
    return res.status(500).json({
      success: false,
      message: 'File validation failed'
    });
  }
};

/**
 * Safely remove a file, ignoring errors if it doesn't exist.
 */
function safeRemove(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('[Security] Could not remove rejected file:', e.message);
  }
}

/**
 * Validate an assembled file on disk (chunked uploads, etc.)
 */
const validateFileOnDisk = async (filePath, { originalName = '' } = {}) => {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    safeRemove(filePath);
    throw Object.assign(new Error(`File type "${ext}" is not allowed`), { statusCode: 400 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const detectedType = await FileType.fromBuffer(fileBuffer);

  if (!detectedType) {
    safeRemove(filePath);
    throw Object.assign(new Error('Unable to verify assembled file type'), { statusCode: 400 });
  }

  if (!ALL_ALLOWED.has(detectedType.mime)) {
    safeRemove(filePath);
    throw Object.assign(
      new Error(`Detected file type "${detectedType.mime}" is not allowed`),
      { statusCode: 400 }
    );
  }

  return { mime: detectedType.mime, ext: detectedType.ext };
};

module.exports = {
  validateFileContent,
  validateFileOnDisk,
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS
};
