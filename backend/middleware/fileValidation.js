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
 * Handles both single (req.file) and multiple (req.files) uploads.
 * Runs AFTER multer has saved the file but BEFORE it is served to users.
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
  '.dll', '.sys', '.drv', '.inf', '.reg', '.svg', '.html', '.htm'
]);

// Extensions that may safely pair with a detected MIME even when the
// claimed MIME is absent or unreliable.
const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.json']);

/**
 * Check a file's original name against the dangerous extension blocklist.
 * @param {Object} file - Multer file object
 * @returns {string|null} Rejection reason or null if safe
 */
const checkDangerousExtension = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return `File type "${ext}" is not allowed for security reasons`;
  }
  return null;
};

/**
 * Validate a single file's content (magic bytes when bytes are available,
 * otherwise extension + claimed MIME allowlist for remote/Cloudinary files).
 * @param {Object} file - Multer file object
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
const validateSingleFile = async (file) => {
  const extReason = checkDangerousExtension(file);
  if (extReason) {
    safeRemove(file.path);
    return { valid: false, error: extReason };
  }

  const claimedMime = (file.mimetype || '').toLowerCase();
  const hasBytes = Buffer.isBuffer(file.buffer) && file.buffer.length > 0;

  // Local upload: bytes are on disk -> full magic-byte verification.
  const localPath = file.path && !/^https?:\/\//i.test(file.path) && fs.existsSync(file.path)
    ? file.path
    : null;

  let buffer = null;
  if (hasBytes) {
    buffer = file.buffer;
  } else if (localPath) {
    try {
      buffer = fs.readFileSync(localPath);
    } catch {
      safeRemove(localPath);
      return { valid: false, error: 'Unable to read uploaded file' };
    }
  }

  if (buffer) {
    let detectedType = null;
    try {
      detectedType = await FileType.fromBuffer(buffer);
    } catch {
      detectedType = null;
    }

    // Text-based formats produce no magic bytes -> scan content, allow safe text.
    if (!detectedType) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const isTextBased = claimedMime.startsWith('text/') || claimedMime === 'application/json' || TEXT_EXTENSIONS.has(ext);
      if (isTextBased) {
        const textContent = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));
        if (/<\?php/i.test(textContent) || /<script/i.test(textContent) || /<svg/i.test(textContent)) {
          safeRemove(localPath);
          return { valid: false, error: 'File contains potentially malicious content' };
        }
        file.verifiedMime = claimedMime;
        return { valid: true };
      }

      const mimePrefixOk = claimedMime.startsWith('audio/') || claimedMime.startsWith('image/') || claimedMime.startsWith('video/');
      if (mimePrefixOk) {
        // Some media (webm audio/video, some WAVs) lack reliable magic bytes.
        file.verifiedMime = claimedMime;
        return { valid: true };
      }

      safeRemove(localPath);
      return { valid: false, error: 'Unable to verify file type. Upload rejected.' };
    }

    // Special-case: some WAV files are detected as 'audio/vnd.wave' or similar.
    if (detectedType.ext === 'wav') {
      file.verifiedMime = 'audio/wav';
      file.verifiedExt = 'wav';
      return { valid: true };
    }

    const mimeBase = (detectedType.mime || '').split(';')[0].trim();
    if (!ALL_ALLOWED.has(detectedType.mime) && !ALL_ALLOWED.has(mimeBase)) {
      safeRemove(localPath);
      return { valid: false, error: `Detected file type "${detectedType.mime}" is not allowed` };
    }

    file.verifiedMime = detectedType.mime;
    file.verifiedExt = detectedType.ext;
    return { valid: true };
  }

  // Remote/Cloudinary upload (no local bytes): enforce extension blocklist
  // and claimed-MIME allowlist. Also guard against claim/extension mismatch.
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!claimedMime || !ALL_ALLOWED.has(claimedMime)) {
    safeRemove(localPath);
    return { valid: false, error: 'Unable to verify file type. Upload rejected.' };
  }

  const mimeBase = claimedMime.split(';')[0].trim();
  if (!ALL_ALLOWED.has(claimedMime) && !ALL_ALLOWED.has(mimeBase)) {
    safeRemove(localPath);
    return { valid: false, error: `Detected file type "${claimedMime}" is not allowed` };
  }

  // Text claimed but dangerous ext -> reject.
  if ((claimedMime.startsWith('text/') || claimedMime === 'application/json') && DANGEROUS_EXTENSIONS.has(ext)) {
    safeRemove(localPath);
    return { valid: false, error: `File type "${ext}" is not allowed for security reasons` };
  }

  file.verifiedMime = claimedMime;
  return { valid: true };
};

/**
 * Validate uploaded files: single (req.file) or multiple (req.files).
 * Removes rejected files from disk.
 */
const validateFileContent = async (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files) && req.files.length) files.push(...req.files);

  if (files.length === 0) {
    console.log('[Security] No file to validate');
    return next();
  }

  for (const file of files) {
    const result = await validateSingleFile(file);
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
  }

  return next();
};

/**
 * Safely remove a file, ignoring errors if it doesn't exist.
 */
function safeRemove(filePath) {
  try {
    if (filePath && !/^https?:\/\//i.test(filePath) && fs.existsSync(filePath)) {
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
