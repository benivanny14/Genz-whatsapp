/**
 * Virus scanning middleware for file uploads.
 *
 * Uses ClamAV (clamscan) to scan uploaded files before they're processed.
 * If ClamAV is not installed or the scan fails, the file is rejected by
 * default (fail-closed) — set CLAMSCAN_STRICT=false to fail-open.
 *
 * Env:
 *   CLAMSCAN_STRICT — reject on scan error (default: true)
 *   CLAMSCAN_PATH   — path to clamd socket (optional, auto-detect)
 *
 * Usage:
 *   const { virusScanMiddleware } = require('./middleware/virusScan');
 *   app.use('/api/upload', upload.single('file'), virusScanMiddleware);
 */
const fs = require('fs');

let clamscanInstance = null;

async function getClamScan() {
  if (clamscanInstance) return clamscanInstance;
  try {
    const ClamScan = require('clamscan');
    clamscanInstance = await new ClamScan({
      // Use system clamd if available, otherwise the Node.js implementation
      clamdscan: {
        socket: process.env.CLAMSCAN_PATH || undefined,
        timeout: 10000,
      },
      preference: 'clamdscan',
    }).init();
    console.log('[VirusScan] ClamAV initialized successfully');
    return clamscanInstance;
  } catch (err) {
    console.warn('[VirusScan] ClamAV not available:', err.message);
    clamscanInstance = null;
    return null;
  }
}

/**
 * Express middleware: scan req.file with ClamAV.
 * Must be placed AFTER multer upload middleware.
 */
const virusScanMiddleware = async (req, res, next) => {
  if (!req.file) return next();

  const scan = await getClamScan();
  if (!scan) {
    // ClamAV not installed — check strictness
    if (process.env.CLAMSCAN_STRICT === 'false') {
      console.warn('[VirusScan] ClamAV unavailable, failing open');
      return next();
    }
    return res.status(503).json({
      success: false,
      message: 'Virus scanning unavailable. Upload rejected for safety.',
    });
  }

  try {
    const result = await scan.isInfected(req.file.path);

    if (result.isInfected) {
      // Delete infected file
      try { fs.unlinkSync(req.file.path); } catch {}
      console.warn(`[VirusScan] INFECTED file rejected: ${req.file.originalname} (${result.viruses?.join(', ')})`);
      return res.status(400).json({
        success: false,
        message: 'File contains malware and was rejected.',
        viruses: result.viruses,
      });
    }

    // Clean — also verify file type via magic bytes
    const FileType = require('file-type');
    const fileType = await FileType.fromFile(req.file.path);
    if (!fileType) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({
        success: false,
        message: 'Invalid file type detected.',
      });
    }

    // Attach detected MIME type for downstream use
    req.file.detectedMimeType = fileType.mime;
    next();
  } catch (err) {
    console.error('[VirusScan] Scan error:', err.message);
    // Fail closed on error
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({
      success: false,
      message: 'File scan failed. Upload rejected.',
    });
  }
};

module.exports = { virusScanMiddleware, getClamScan };
