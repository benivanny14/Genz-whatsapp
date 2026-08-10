jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../services/mediaProcessingService', () => ({
  processAndCompressMedia: jest.fn(),
  applyMediaEdits: jest.fn()
}));

const User = require('../models/User');
const mediaProcessing = require('../services/mediaProcessingService');
const mediaTools = require('../controllers/mediaToolsController');

const makeRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  phoneNumber: '255700000001',
  mediaModsSettings: {},
  mediaCompressorSettings: {},
  mediaEditorSettings: {},
  editHistory: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('mediaToolsController — media MODs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await mediaTools.getMediaModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged MODs settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ mediaModsSettings: { viewOnceBypass: true } }));
    const res = makeRes();
    await mediaTools.getMediaModsSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.viewOnceBypass).toBe(true);
    expect(res.body.settings.fullResolutionImages).toBe(false); // default
  });

  it('updates MODs settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.updateMediaModsSettings(makeReq({ body: { settings: { oneGBVideoUpload: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.oneGBVideoUpload).toBe(true);
  });

  it('toggles a single MOD (happy path)', async () => {
    const user = makeUser({ mediaModsSettings: { forwardWithoutTag: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.toggleForwardWithoutTag(makeReq(), res);
    expect(res.body.forwardWithoutTag).toBe(true);
  });

  it('toggles a different MOD independently', async () => {
    const user = makeUser({ mediaModsSettings: { saveViewOnceMedia: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.toggleSaveViewOnce(makeReq(), res);
    expect(res.body.saveViewOnceMedia).toBe(false);
  });
});

describe('mediaToolsController — compressor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns compressor settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ mediaCompressorSettings: { compressionLevel: 'high' } }));
    const res = makeRes();
    await mediaTools.getCompressorSettings(makeReq(), res);
    expect(res.body.settings.compressionLevel).toBe('high');
    expect(res.body.settings.autoCompress).toBe(true); // default
  });

  it('rejects compressMedia without a fileUrl/fileType (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await mediaTools.compressMedia(makeReq({ body: { fileType: 'image' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('File URL and type are required');
  });

  it('rejects an invalid file type (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await mediaTools.compressMedia(makeReq({ body: { fileUrl: 'https://x/y.png', fileType: 'document' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid file type');
  });

  it('compresses media via the processing service (happy path)', async () => {
    mediaProcessing.processAndCompressMedia.mockResolvedValue({
      compressedUrl: 'https://x/compressed.mp4',
      originalSize: 100,
      compressedSize: 50,
      compressionRatio: 50,
      format: 'mp4',
      storageProvider: 'cloudinary'
    });
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.compressMedia(makeReq({ body: { fileUrl: 'https://x/y.mp4', fileType: 'video', compressionLevel: 'high' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.compressedUrl).toBe('https://x/compressed.mp4');
    expect(res.body.compressedSize).toBe(50);
    expect(res.body.compressionRatio).toBe(50);
    expect(mediaProcessing.processAndCompressMedia).toHaveBeenCalledWith({
      fileUrl: 'https://x/y.mp4',
      fileType: 'video',
      compressionLevel: 'high'
    });
  });

  it('persists per-user compression stats (happy path)', async () => {
    mediaProcessing.processAndCompressMedia.mockResolvedValue({
      compressedUrl: 'https://x/c.jpg',
      originalSize: 1000,
      compressedSize: 400,
      compressionRatio: 60
    });
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.compressMedia(makeReq({ body: { fileUrl: 'https://x/y.jpg', fileType: 'image' } }), res);
    expect(user.mediaCompressionStats.totalCompressed).toBe(1);
    expect(user.mediaCompressionStats.byType.image.count).toBe(1);
    expect(user.markModified).toHaveBeenCalledWith('mediaCompressionStats');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns compression stats from the user record (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({
      mediaCompressionStats: {
        totalCompressed: 3,
        totalSaved: 1.5,
        byType: { image: { count: 2, saved: 1 }, video: { count: 1, saved: 0.5 }, audio: { count: 0, saved: 0 } }
      }
    }));
    const res = makeRes();
    await mediaTools.getCompressionStats(makeReq(), res);
    expect(res.body.stats.totalCompressed).toBe(3);
    expect(res.body.stats.averageCompression).toBe(0.5); // 1.5 / 3
  });

  it('returns zeroed compression stats when none recorded yet (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await mediaTools.getCompressionStats(makeReq(), res);
    expect(res.body.stats.totalCompressed).toBe(0);
  });

  it('resets compressor settings (happy path)', async () => {
    const user = makeUser({ mediaCompressorSettings: { compressionLevel: 'high' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.resetCompressorSettings(makeReq(), res);
    expect(res.body.settings.compressionLevel).toBe('medium'); // default
  });
});

describe('mediaToolsController — editor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns editor settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ mediaEditorSettings: { autoSaveEdits: false } }));
    const res = makeRes();
    await mediaTools.getMediaEditorSettings(makeReq(), res);
    expect(res.body.settings.autoSaveEdits).toBe(false);
  });

  it('rejects editImage without an imageUrl (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await mediaTools.editImage(makeReq({ body: { edits: { crop: true } } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Image URL is required');
  });

  it('rejects editing when the editor feature is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ mediaEditorSettings: { imageEditorEnabled: false } }));
    const res = makeRes();
    await mediaTools.editImage(makeReq({ body: { imageUrl: 'https://x/y.png' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Image editing is disabled');
  });

  it('edits an image and saves history (happy path)', async () => {
    mediaProcessing.applyMediaEdits.mockResolvedValue({
      editedUrl: 'https://x/y-edited.png',
      format: 'png',
      storageProvider: 'cloudinary'
    });
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.editImage(makeReq({ body: { imageUrl: 'https://x/y.png', edits: { brightness: 1.2 } } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.editResult.editedUrl).toBe('https://x/y-edited.png');
    expect(mediaProcessing.applyMediaEdits).toHaveBeenCalledWith({
      fileUrl: 'https://x/y.png',
      type: 'image',
      edits: { brightness: 1.2 }
    });
    expect(user.editHistory).toHaveLength(1);
    expect(user.editHistory[0].resultUrl).toBe('https://x/y-edited.png');
    expect(user.save).toHaveBeenCalled();
  });

  it('edits a video (happy path)', async () => {
    mediaProcessing.applyMediaEdits.mockResolvedValue({ editedUrl: 'https://x/y-edited.mp4', format: 'mp4' });
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await mediaTools.editVideo(makeReq({ body: { videoUrl: 'https://x/y.mp4' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.editResult.editedUrl).toBe('https://x/y-edited.mp4');
  });

  it('edits an audio file (happy path)', async () => {
    mediaProcessing.applyMediaEdits.mockResolvedValue({ editedUrl: 'https://x/y-edited.mp3', format: 'mp3' });
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await mediaTools.editAudio(makeReq({ body: { audioUrl: 'https://x/y.mp3' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.editResult.editedUrl).toBe('https://x/y-edited.mp3');
  });

  it('caps edit history to the configured limit', async () => {
    const existing = [];
    for (let i = 0; i < 10; i++) {
      existing.push({ _id: `e${i}`, type: 'image', originalUrl: `u${i}`, edits: {}, resultUrl: `u${i}`, createdAt: new Date() });
    }
    const user = makeUser({ editHistory: existing, mediaEditorSettings: { editHistoryLimit: 10 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.editImage(makeReq({ body: { imageUrl: 'https://x/new.png' } }), res);
    expect(user.editHistory).toHaveLength(10);
    expect(user.editHistory[9].originalUrl).toBe('https://x/new.png');
  });

  it('returns edit history (happy path)', async () => {
    const user = makeUser({ editHistory: [{ _id: 'e1', type: 'image' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.getEditHistory(makeReq(), res);
    expect(res.body.history).toHaveLength(1);
  });

  it('clears edit history (happy path)', async () => {
    const user = makeUser({ editHistory: [{ _id: 'e1' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.clearEditHistory(makeReq(), res);
    expect(user.editHistory).toEqual([]);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles editor features explicitly (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.toggleMediaEditor(makeReq({ body: { imageEnabled: false, videoEnabled: true } }), res);
    expect(res.body.settings.imageEditorEnabled).toBe(false);
    expect(res.body.settings.videoEditorEnabled).toBe(true);
  });

  it('resets editor settings (happy path)', async () => {
    const user = makeUser({ mediaEditorSettings: { imageEditorEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await mediaTools.resetMediaEditorSettings(makeReq(), res);
    expect(res.body.settings.imageEditorEnabled).toBe(true); // default
  });
});
