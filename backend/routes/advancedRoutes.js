const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB max for status media
  }
});
const {
  aiAssistant,
  smartReplies,
  mediaCaption,
  summarizeMessages,
  translateMessage,
  scheduleMessage,
  getScheduledMessages,
  cancelScheduledMessage,
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
  replyToStatus,
  likeStatus,
  saveStatus,
  shareStatus,
  reshareStatus,
  uploadStatusMedia,
  createBroadcast,
  getBroadcasts,
  updateBroadcast,
  deleteBroadcast,
  sendBroadcastMessage,
  setDisappearingMessages,
  searchMessages,
  getLinkPreview,
  getGifs,
  transcribeAudio,
  getDashboardStats,
  getStatusReel,
  getOnlineRanking
} = require('../controllers/advancedController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/ai-assistant', aiAssistant);
router.post('/smart-replies', smartReplies);
router.post('/media-caption', mediaCaption);
router.post('/summarize-messages', summarizeMessages);
router.post('/translate', translateMessage);
router.post('/schedule-message', scheduleMessage);
router.get('/scheduled-messages', getScheduledMessages);
router.delete('/scheduled-messages/:id', cancelScheduledMessage);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/online-ranking', getOnlineRanking);

// Status routes (order matters: specific before :id)
const { validateFileContent, validateFileOnDisk } = require('../middleware/fileValidation');
const { buildSignedUploadPath } = require('../utils/mediaAccess');
router.post('/status', createStatus);
router.post('/status/upload', upload.single('file'), validateFileContent, uploadStatusMedia);
router.get('/status/reel', getStatusReel);
router.get('/status', getStatuses);
router.post('/status/:id/view', viewStatus);
router.delete('/status/:id', deleteStatus);
router.post('/status/:id/reply', replyToStatus);
router.post('/status/reply/:id', replyToStatus);
router.post('/status/:id/like', likeStatus);
router.post('/status/:id/save', saveStatus);
router.post('/status/:id/share', shareStatus);
router.post('/status/:id/reshare', reshareStatus);

// Broadcast routes
router.post('/broadcast', createBroadcast);
router.get('/broadcast', getBroadcasts);
router.put('/broadcast/:id', updateBroadcast);
router.delete('/broadcast/:id', deleteBroadcast);
router.post('/broadcast/:id/send', sendBroadcastMessage);

router.put('/conversations/:id/disappearing-messages', setDisappearingMessages);
router.get('/search-messages', searchMessages);
router.get('/link-preview', getLinkPreview);
router.get('/gifs', getGifs);
router.post('/transcribe-audio', transcribeAudio);

// ── Chunked Upload (10GB support) ──
const fs = require('fs');
const path = require('path');
const finalUploadDir = path.resolve(__dirname, '../uploads');
const chunkUploadDir = path.join(finalUploadDir, 'chunks');
const MAX_CHUNK_SIZE_BYTES = Number(process.env.MAX_CHUNK_SIZE_BYTES || 100 * 1024 * 1024);
const MAX_CHUNKED_UPLOAD_BYTES = Number(process.env.MAX_CHUNKED_UPLOAD_BYTES || 10 * 1024 * 1024 * 1024);
const MAX_CHUNK_COUNT = Math.ceil(MAX_CHUNKED_UPLOAD_BYTES / MAX_CHUNK_SIZE_BYTES);

if (!fs.existsSync(chunkUploadDir)) fs.mkdirSync(chunkUploadDir, { recursive: true });

const sanitizeUploadId = (value = '') => {
  const uploadId = String(value).trim();
  return /^[a-zA-Z0-9_-]{12,80}$/.test(uploadId) ? uploadId : null;
};

const sanitizeStoredFileName = (value = 'file') => {
  const baseName = path.basename(String(value)).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
  return baseName || 'file';
};

const parseChunkInteger = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const resolveInside = (root, fileName) => {
  const resolved = path.resolve(root, fileName);
  if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
    const error = new Error('Invalid upload path');
    error.statusCode = 400;
    throw error;
  }
  return resolved;
};

const getChunkPath = (uploadId, chunkIndex) => resolveInside(chunkUploadDir, `${uploadId}_${chunkIndex}`);

const appendChunkToStream = (chunkPath, writeStream) => new Promise((resolve, reject) => {
  const readStream = fs.createReadStream(chunkPath);
  const cleanup = () => {
    readStream.off('error', onError);
    writeStream.off('error', onError);
  };
  const onError = (error) => {
    cleanup();
    reject(error);
  };

  readStream.once('error', onError);
  writeStream.once('error', onError);
  readStream.once('end', () => {
    cleanup();
    resolve();
  });
  readStream.pipe(writeStream, { end: false });
});

const chunkStorage = multer.diskStorage({
  destination: chunkUploadDir,
  filename: (req, file, cb) => {
    const uploadId = sanitizeUploadId(req.body.uploadId || req.query.uploadId);
    const chunkIndex = parseChunkInteger(req.body.chunkIndex ?? req.query.chunkIndex);

    if (!uploadId || chunkIndex === null) {
      return cb(new Error('Invalid upload session or chunk index'));
    }

    return cb(null, `${uploadId}_${chunkIndex}`);
  }
});
const chunkUpload = multer({ storage: chunkStorage, limits: { fileSize: MAX_CHUNK_SIZE_BYTES } });

// Init upload session
router.post('/upload/init', (req, res) => {
  const { fileName, fileSize, totalChunks, mimeType } = req.body;
  const numericFileSize = Number(fileSize);
  const numericTotalChunks = parseChunkInteger(totalChunks);

  if (!fileName || !Number.isFinite(numericFileSize) || numericFileSize <= 0) {
    return res.status(400).json({ success: false, message: 'Valid fileName and fileSize are required' });
  }

  if (numericFileSize > MAX_CHUNKED_UPLOAD_BYTES) {
    return res.status(413).json({
      success: false,
      message: 'File exceeds the maximum chunked upload limit'
    });
  }

  if (numericTotalChunks === null || numericTotalChunks < 1 || numericTotalChunks > MAX_CHUNK_COUNT) {
    return res.status(400).json({
      success: false,
      message: `totalChunks must be between 1 and ${MAX_CHUNK_COUNT}`
    });
  }

  const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
  res.json({
    success: true,
    uploadId,
    maxChunkSize: MAX_CHUNK_SIZE_BYTES,
    maxUploadSize: MAX_CHUNKED_UPLOAD_BYTES,
    fileName: sanitizeStoredFileName(fileName),
    mimeType: String(mimeType || ''),
    message: 'Upload session created'
  });
});

// Upload individual chunk
router.post('/upload/chunk', chunkUpload.single('chunk'), (req, res) => {
  const { uploadId, chunkIndex, totalChunks } = req.body;
  const safeUploadId = sanitizeUploadId(uploadId);
  const numericChunkIndex = parseChunkInteger(chunkIndex);
  const numericTotalChunks = parseChunkInteger(totalChunks);

  if (!req.file) return res.status(400).json({ success: false, message: 'No chunk received' });
  if (!safeUploadId || numericChunkIndex === null || numericTotalChunks === null || numericTotalChunks < 1) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: 'Invalid chunk metadata' });
  }
  if (numericChunkIndex >= numericTotalChunks || numericTotalChunks > MAX_CHUNK_COUNT) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: 'Chunk index is out of range' });
  }

  res.json({ success: true, uploadId: safeUploadId, chunkIndex: numericChunkIndex, message: 'Chunk received' });
});

// Complete upload: assemble all chunks
router.post('/upload/complete', async (req, res) => {
  const { uploadId, fileName, totalChunks } = req.body;
  try {
    const safeUploadId = sanitizeUploadId(uploadId);
    const numericTotalChunks = parseChunkInteger(totalChunks);

    if (!safeUploadId || !fileName || numericTotalChunks === null || numericTotalChunks < 1 || numericTotalChunks > MAX_CHUNK_COUNT) {
      return res.status(400).json({ success: false, message: 'Invalid upload completion metadata' });
    }

    const safeFileName = `${safeUploadId}_${sanitizeStoredFileName(fileName)}`;
    const finalPath = resolveInside(finalUploadDir, safeFileName);

    if (fs.existsSync(finalPath)) {
      return res.status(409).json({ success: false, message: 'Uploaded file already exists' });
    }

    let totalBytes = 0;
    const chunkPaths = [];
    for (let i = 0; i < numericTotalChunks; i++) {
      const chunkPath = getChunkPath(safeUploadId, i);
      if (!fs.existsSync(chunkPath)) {
        return res.status(400).json({ success: false, message: `Missing chunk ${i}` });
      }
      const stats = fs.statSync(chunkPath);
      totalBytes += stats.size;
      if (totalBytes > MAX_CHUNKED_UPLOAD_BYTES) {
        return res.status(413).json({ success: false, message: 'Assembled file exceeds maximum upload size' });
      }
      chunkPaths.push(chunkPath);
    }

    const writeStream = fs.createWriteStream(finalPath, { flags: 'wx' });
    try {
      for (const chunkPath of chunkPaths) {
        await appendChunkToStream(chunkPath, writeStream);
      }
      await new Promise((resolve, reject) => {
        writeStream.end(resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      writeStream.destroy();
      fs.unlink(finalPath, () => {});
      throw error;
    }

    chunkPaths.forEach((chunkPath) => fs.unlink(chunkPath, () => {}));

    try {
      await validateFileOnDisk(finalPath, { originalName: fileName });
    } catch (validationError) {
      fs.unlink(finalPath, () => {});
      return res.status(validationError.statusCode || 400).json({
        success: false,
        message: validationError.message
      });
    }

    const fileUrl = buildSignedUploadPath(safeFileName);
    res.json({ success: true, fileUrl, fileName: safeFileName, size: totalBytes, message: 'File assembled successfully' });
  } catch (err) {
    console.error('Chunked upload complete error:', err);
    res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : 'Failed to assemble file' });
  }
});

// Serve uploaded files
router.get('/upload/file/:filename', (req, res) => {
  const safeFileName = sanitizeStoredFileName(req.params.filename);
  const filePath = resolveInside(finalUploadDir, safeFileName);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

// ── Dashboard Stats alias (ChatArea uses /dashboard-stats) ──
router.get('/dashboard-stats', getDashboardStats);

module.exports = router;
