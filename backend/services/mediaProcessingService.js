/**
 * mediaProcessingService.js
 * -------------------------
 * Real media processing for the mediaToolsController (previously the
 * compress/edit handlers returned simulated results).
 *
 * Flow: download the media URL → compress/edit with sharp (images) or
 * ffmpeg (video/audio) → upload the result through config/cloudinary
 * (with its local-storage fallback) → clean up the temp files.
 *
 * The heavy libraries (sharp, fluent-ffmpeg, ffmpeg-static) are required
 * lazily inside the functions so unit tests that mock this service never
 * load native binaries.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const { uploadFile } = require('../config/cloudinary');

const TMP_DIR = path.join(os.tmpdir(), 'genz-media');
fs.mkdirSync(TMP_DIR, { recursive: true });

const randomName = (ext) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

const cleanup = (paths) => {
  for (const p of paths) {
    fs.unlink(p, () => {});
  }
};

/**
 * Download a URL to a temp file (follows redirects, 30s timeout).
 * @returns {Promise<string>} path to the downloaded file
 */
const downloadFile = (url) => new Promise((resolve, reject) => {
  const client = url.startsWith('https:') ? https : http;
  const tmpPath = path.join(TMP_DIR, randomName('.download'));
  const file = fs.createWriteStream(tmpPath);

  const finish = () => file.close(() => resolve(tmpPath));
  const abort = (err) => {
    file.close(() => {
      fs.unlink(tmpPath, () => {});
      reject(err);
    });
  };

  const request = client.get(url, (response) => {
    // Follow a single redirect
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      response.resume();
      file.close(() => {
        fs.unlink(tmpPath, () => {});
        downloadFile(new URL(response.headers.location, url).toString()).then(resolve, reject);
      });
      return;
    }
    if (response.statusCode !== 200) {
      response.resume();
      abort(new Error(`Failed to download media: HTTP ${response.statusCode}`));
      return;
    }
    response.pipe(file);
    file.on('finish', finish);
  });

  request.on('error', abort);
  request.setTimeout(30000, () => request.destroy(new Error('Media download timed out')));
});

// ── sharp (images) ───────────────────────────────────────────────────────────

const getSharp = () => require('sharp');

const IMAGE_QUALITY = { low: 85, medium: 70, high: 55 };

const encodeImage = (pipeline, format, quality) => {
  if (format === 'png') return pipeline.png({ compressionLevel: 9, palette: true });
  if (format === 'webp') return pipeline.webp({ quality });
  return pipeline.jpeg({ quality, mozjpeg: true });
};

const compressImage = async (inputPath, outputPath, level) => {
  const sharp = getSharp();
  const meta = await sharp(inputPath).metadata();
  const format = meta.format;

  // sharp cannot meaningfully compress gifs/svgs — pass them through.
  if (format === 'gif' || format === 'svg') {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const quality = IMAGE_QUALITY[level] || IMAGE_QUALITY.medium;
  const pipeline = sharp(inputPath)
    .rotate()
    .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true });

  await encodeImage(pipeline, format, quality).toFile(outputPath);
};

const editImage = async (inputPath, outputPath, edits) => {
  const sharp = getSharp();
  const meta = await sharp(inputPath).metadata();
  const format = meta.format;

  let pipeline = sharp(inputPath).rotate();

  if (edits.resize) pipeline = pipeline.resize(edits.resize);
  if (edits.crop) pipeline = pipeline.extract(edits.crop);
  if (edits.rotate && Number(edits.rotate) !== 0) pipeline = pipeline.rotate(Number(edits.rotate));
  if (edits.brightness !== undefined || edits.saturation !== undefined || edits.hue !== undefined) {
    pipeline = pipeline.modulate({
      brightness: edits.brightness !== undefined ? Number(edits.brightness) : 1,
      saturation: edits.saturation !== undefined ? Number(edits.saturation) : 1,
      hue: edits.hue !== undefined ? Number(edits.hue) : 0
    });
  }
  if (edits.contrast !== undefined) {
    const factor = Math.max(0, Number(edits.contrast));
    pipeline = pipeline.linear(factor, -(128 * factor) + 128);
  }
  if (edits.grayscale) pipeline = pipeline.grayscale();
  if (edits.blur) pipeline = pipeline.blur(Number(edits.blur));
  if (edits.sharpen) pipeline = pipeline.sharpen();
  if (edits.flip) pipeline = pipeline.flip();
  if (edits.flop) pipeline = pipeline.flop();
  if (edits.tint) pipeline = pipeline.tint(edits.tint);

  await encodeImage(pipeline, format, 90).toFile(outputPath);
};

// ── ffmpeg (video / audio) ───────────────────────────────────────────────────

const runFfmpeg = (inputPath, outputPath, buildCommand) => new Promise((resolve, reject) => {
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(require('ffmpeg-static'));
  const command = ffmpeg(inputPath);
  buildCommand(command);
  command
    .on('end', resolve)
    .on('error', reject)
    .save(outputPath);
});

const VIDEO_CRF = { low: 23, medium: 26, high: 30 };
const AUDIO_BITRATE = { low: '128k', medium: '96k', high: '64k' };

const compressVideo = (inputPath, outputPath, level) =>
  runFfmpeg(inputPath, outputPath, (cmd) => {
    cmd
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('1280x720')
      .outputOptions(['-preset veryfast', `-crf ${VIDEO_CRF[level] || VIDEO_CRF.medium}`, '-movflags +faststart']);
  });

const compressAudio = (inputPath, outputPath, level) =>
  runFfmpeg(inputPath, outputPath, (cmd) => {
    cmd.audioCodec('libmp3lame').audioBitrate(AUDIO_BITRATE[level] || AUDIO_BITRATE.medium).format('mp3');
  });

const applyTrim = (cmd, trim) => {
  if (trim && (trim.start !== undefined || trim.end !== undefined)) {
    if (trim.start !== undefined) cmd.seekInput(String(trim.start));
    if (trim.end !== undefined) {
      const start = trim.start !== undefined ? Number(trim.start) : 0;
      cmd.duration(String(Math.max(0, Number(trim.end) - start)));
    }
  }
};

const editVideo = (inputPath, outputPath, edits) =>
  runFfmpeg(inputPath, outputPath, (cmd) => {
    cmd.videoCodec('libx264').audioCodec('aac').outputOptions(['-preset veryfast', '-movflags +faststart']);
    applyTrim(cmd, edits.trim);
    if (edits.mute) cmd.noAudio();
    else if (edits.volume !== undefined) cmd.audioFilters(`volume=${edits.volume}`);
    if (edits.speed !== undefined && Number(edits.speed) > 0) cmd.videoFilters(`setpts=PTS/${edits.speed}`);
  });

const editAudio = (inputPath, outputPath, edits) =>
  runFfmpeg(inputPath, outputPath, (cmd) => {
    cmd.audioCodec('libmp3lame').format('mp3');
    applyTrim(cmd, edits.trim);
    if (edits.mute) cmd.noAudio();
    else if (edits.volume !== undefined) cmd.audioFilters(`volume=${edits.volume}`);
    if (edits.speed !== undefined && Number(edits.speed) > 0) cmd.audioFilters(`atempo=${edits.speed}`);
  });

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Download, compress and re-upload a media file.
 * @returns {Promise<{compressedUrl, originalSize, compressedSize, compressionRatio, format, width?, height?, duration?, storageProvider}>}
 */
const processAndCompressMedia = async ({ fileUrl, fileType, compressionLevel = 'medium' }) => {
  const level = ['low', 'medium', 'high'].includes(compressionLevel) ? compressionLevel : 'medium';
  const inputPath = await downloadFile(fileUrl);
  const ext = fileType === 'image' ? '.jpg' : fileType === 'video' ? '.mp4' : '.mp3';
  const outputPath = path.join(TMP_DIR, randomName(ext));

  try {
    if (fileType === 'image') await compressImage(inputPath, outputPath, level);
    else if (fileType === 'video') await compressVideo(inputPath, outputPath, level);
    else await compressAudio(inputPath, outputPath, level);

    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const upload = await uploadFile(outputPath, fileType);

    return {
      compressedUrl: upload.url,
      originalSize,
      compressedSize,
      compressionRatio: originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0,
      format: upload.format,
      width: upload.width,
      height: upload.height,
      duration: upload.duration,
      storageProvider: upload.storageProvider
    };
  } finally {
    cleanup([inputPath, outputPath]);
  }
};

/**
 * Download, apply edits and re-upload a media file.
 * @returns {Promise<{editedUrl, width?, height?, duration?, format, storageProvider}>}
 */
const applyMediaEdits = async ({ fileUrl, type, edits = {} }) => {
  const inputPath = await downloadFile(fileUrl);
  const ext = type === 'image' ? '.jpg' : type === 'video' ? '.mp4' : '.mp3';
  const outputPath = path.join(TMP_DIR, randomName(ext));

  try {
    if (type === 'image') await editImage(inputPath, outputPath, edits);
    else if (type === 'video') await editVideo(inputPath, outputPath, edits);
    else await editAudio(inputPath, outputPath, edits);

    const upload = await uploadFile(outputPath, type);

    return {
      editedUrl: upload.url,
      width: upload.width,
      height: upload.height,
      duration: upload.duration,
      format: upload.format,
      storageProvider: upload.storageProvider
    };
  } finally {
    cleanup([inputPath, outputPath]);
  }
};

module.exports = {
  downloadFile,
  processAndCompressMedia,
  applyMediaEdits
};
