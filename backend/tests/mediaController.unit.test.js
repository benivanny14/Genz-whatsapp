jest.mock('../config/cloudinary', () => ({
  deleteFile: jest.fn(),
  deleteFiles: jest.fn(),
  getFileInfo: jest.fn(),
  listResources: jest.fn(),
  generateSignedUrl: jest.fn(),
  transformImage: jest.fn(),
  getVideoThumbnail: jest.fn(),
  isConfigured: jest.fn(() => false),
  uploadFile: jest.fn(),
  getFileType: jest.fn(() => 'image')
}));

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn()
}));

jest.mock('../models/Status', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../models/User', () => ({
  findOne: jest.fn()
}));

jest.mock('../utils/mediaAccess', () => ({
  signLocalUrlIfNeeded: jest.fn((url) => url),
  buildSignedUploadPath: jest.fn((p, ttl) => `/uploads/${p}?expires=${ttl}`)
}));

jest.mock('../utils/publicBaseUrl', () => ({
  resolvePublicBaseUrl: jest.fn(() => 'https://app.example.com')
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(),
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

const cloudinary = require('../config/cloudinary');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Status = require('../models/Status');
const User = require('../models/User');
const mediaController = require('../controllers/mediaController');

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
  query: {},
  file: null,
  files: [],
  user: { _id: 'user-1' },
  ...overrides
});

// The ownership helpers chain .select('_id') on the query results.
const mockFindOneChain = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks does not reset implementations, so restore defaults here.
  cloudinary.isConfigured.mockReturnValue(false);
  cloudinary.getFileType.mockReturnValue('image');
  const fs = require('fs');
  fs.existsSync.mockReturnValue(false);
  fs.readdirSync.mockReturnValue([]);
  fs.promises.unlink.mockResolvedValue(undefined);
});

describe('mediaController — uploads', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an upload with no file (validation)', async () => {
    const res = makeRes();
    await mediaController.uploadFile(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('normalizes a local file upload (happy path)', async () => {
    const res = makeRes();
    await mediaController.uploadFile(makeReq({
      file: {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/tmp/photo.jpg',
        filename: 'abc123.jpg'
      }
    }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.fileName).toBe('photo.jpg');
    expect(res.body.storageProvider).toBe('local');
    expect(res.body.fileUrl).toContain('/uploads/abc123.jpg');
  });

  it('uses the Cloudinary result when configured (happy path)', async () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.uploadFile.mockResolvedValue({
      url: 'https://res.cloudinary.com/x/image/upload/v1/genz-whatsapp/image/abc.jpg',
      publicId: 'genz-whatsapp/image/abc',
      resourceType: 'image',
      format: 'jpg',
      storageProvider: 'cloudinary'
    });
    const res = makeRes();
    await mediaController.uploadFile(makeReq({
      file: {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/tmp/photo.jpg',
        filename: 'abc.jpg'
      }
    }), res);
    expect(cloudinary.uploadFile).toHaveBeenCalledWith('/tmp/photo.jpg', 'image', { folder: 'genz-whatsapp/image' });
    expect(res.body.fileUrl).toBe('https://res.cloudinary.com/x/image/upload/v1/genz-whatsapp/image/abc.jpg');
  });

  it('returns 500 when the upload throws (error)', async () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.uploadFile.mockRejectedValue(new Error('upload failed'));
    const res = makeRes();
    await mediaController.uploadFile(makeReq({
      file: {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/tmp/photo.jpg',
        filename: 'abc.jpg'
      }
    }), res);
    expect(res.statusCode).toBe(500);
  });

  it('rejects a multi-upload with no files (validation)', async () => {
    const res = makeRes();
    await mediaController.uploadMultipleFiles(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('normalizes multiple files (happy path)', async () => {
    const res = makeRes();
    await mediaController.uploadMultipleFiles(makeReq({
      files: [
        { originalname: 'a.jpg', mimetype: 'image/jpeg', size: 10, path: '', filename: 'a.jpg' },
        { originalname: 'b.png', mimetype: 'image/png', size: 20, path: '', filename: 'b.png' }
      ]
    }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.files).toHaveLength(2);
  });
});

describe('mediaController — delete endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a delete without a publicId (validation)', async () => {
    const res = makeRes();
    await mediaController.deleteFile(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when the user is not the owner and not admin (auth)', async () => {
    Message.findOne.mockReturnValue(mockFindOneChain(null));
    Status.findOne.mockReturnValue(mockFindOneChain(null));
    User.findOne.mockReturnValue(mockFindOneChain(null));
    const res = makeRes();
    await mediaController.deleteFile(makeReq({ params: { publicId: 'pub-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('allows deletion when the user owns the media (happy path)', async () => {
    Message.findOne.mockReturnValue(mockFindOneChain({ _id: 'm1' }));
    const res = makeRes();
    await mediaController.deleteFile(makeReq({ params: { publicId: 'pub-1' } }), res);
    expect(res.statusCode).toBe(503); // cloudinary not configured
    expect(res.body.success).toBe(false);
  });

  it('deletes via Cloudinary when configured (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    Message.findOne.mockReturnValue(mockFindOneChain({ _id: 'm1' }));
    cloudinary.deleteFile.mockResolvedValue({ result: 'ok' });
    const res = makeRes();
    await mediaController.deleteFile(makeReq({ params: { publicId: 'pub-1' } }), res);
    expect(cloudinary.deleteFile).toHaveBeenCalledWith('pub-1', 'image');
    expect(res.body.result).toBe('ok');
  });

  it('skips ownership check for admins (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.deleteFile.mockResolvedValue({ result: 'ok' });
    const res = makeRes();
    await mediaController.deleteFile(makeReq({ params: { publicId: 'pub-1' }, isAdmin: true }), res);
    expect(cloudinary.deleteFile).toHaveBeenCalled();
  });

  it('returns 500 when delete throws (error)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    Message.findOne.mockReturnValue(mockFindOneChain({ _id: 'm1' }));
    cloudinary.deleteFile.mockRejectedValue(new Error('cloud down'));
    const res = makeRes();
    await mediaController.deleteFile(makeReq({ params: { publicId: 'pub-1' } }), res);
    expect(res.statusCode).toBe(500);
  });

  it('rejects a batch delete without publicIds (validation)', async () => {
    const res = makeRes();
    await mediaController.deleteFiles(makeReq({ body: { publicIds: [] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a batch delete when the user lacks ownership (auth)', async () => {
    Message.findOne.mockReturnValue(mockFindOneChain(null));
    Status.findOne.mockReturnValue(mockFindOneChain(null));
    User.findOne.mockReturnValue(mockFindOneChain(null));
    const res = makeRes();
    await mediaController.deleteFiles(makeReq({ body: { publicIds: ['pub-1'] } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deletes a batch via Cloudinary (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    Message.findOne.mockReturnValue(mockFindOneChain({ _id: 'm1' }));
    cloudinary.deleteFiles.mockResolvedValue({ deleted: ['pub-1'] });
    const res = makeRes();
    await mediaController.deleteFiles(makeReq({ body: { publicIds: ['pub-1', 'pub-2'] } }), res);
    expect(cloudinary.deleteFiles).toHaveBeenCalledWith(['pub-1', 'pub-2'], 'image');
    expect(res.body.deleted).toEqual(['pub-1']);
  });
});

describe('mediaController — info & signed URLs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects getFileInfo without a publicId (validation)', async () => {
    const res = makeRes();
    await mediaController.getFileInfo(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 503 for getFileInfo when cloudinary is not configured', async () => {
    const res = makeRes();
    await mediaController.getFileInfo(makeReq({ params: { publicId: 'pub-1' } }), res);
    expect(res.statusCode).toBe(503);
  });

  it('returns file info from cloudinary (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.getFileInfo.mockResolvedValue({ bytes: 100 });
    const res = makeRes();
    await mediaController.getFileInfo(makeReq({ params: { publicId: 'pub-1' } }), res);
    expect(cloudinary.getFileInfo).toHaveBeenCalledWith('pub-1', 'image');
    expect(res.body.bytes).toBe(100);
  });

  it('rejects generateSignedUrl without a publicId (validation)', async () => {
    const res = makeRes();
    await mediaController.generateSignedUrl(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('builds a local signed path when cloudinary is not configured (happy path)', async () => {
    const res = makeRes();
    await mediaController.generateSignedUrl(makeReq({ params: { publicId: 'media/abc.jpg' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.signedUrl).toContain('/uploads/media/abc.jpg');
    expect(res.body.expiresIn).toBe(3600);
  });

  it('caps the requested expiry to 24h (happy path)', async () => {
    const res = makeRes();
    await mediaController.generateSignedUrl(makeReq({ params: { publicId: 'a.jpg' }, query: { expiresIn: '999999' } }), res);
    expect(res.body.expiresIn).toBe(86400);
  });

  it('returns a signed url from cloudinary (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.generateSignedUrl.mockResolvedValue('https://signed.example.com/a');
    const res = makeRes();
    await mediaController.generateSignedUrl(makeReq({ params: { publicId: 'a.jpg' } }), res);
    expect(res.body.signedUrl).toBe('https://signed.example.com/a');
  });

  it('rejects signLocalMedia without a path (validation)', async () => {
    const res = makeRes();
    await mediaController.signLocalMedia(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects signing a non-/uploads path (validation)', async () => {
    const res = makeRes();
    await mediaController.signLocalMedia(makeReq({ query: { path: '/etc/passwd' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('signs a local /uploads path (happy path)', async () => {
    const res = makeRes();
    await mediaController.signLocalMedia(makeReq({ query: { path: '/uploads/a.jpg' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toContain('/uploads/a.jpg');
  });
});

describe('mediaController — transforms & cleanup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects transformImage without a publicId (validation)', async () => {
    const res = makeRes();
    await mediaController.transformImage(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 503 for transformImage when cloudinary is not configured', async () => {
    const res = makeRes();
    await mediaController.transformImage(makeReq({ params: { publicId: 'a.jpg' } }), res);
    expect(res.statusCode).toBe(503);
  });

  it('transforms an image via cloudinary (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.transformImage.mockReturnValue('https://res.cloudinary.com/x/t/w_100/a.jpg');
    const res = makeRes();
    await mediaController.transformImage(makeReq({ params: { publicId: 'a.jpg' }, query: { w: '100' } }), res);
    expect(cloudinary.transformImage).toHaveBeenCalledWith('a.jpg', { w: '100' });
    expect(res.body.transformedUrl).toContain('w_100');
  });

  it('rejects getVideoThumbnail without a publicId (validation)', async () => {
    const res = makeRes();
    await mediaController.getVideoThumbnail(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 503 for getVideoThumbnail when cloudinary is not configured', async () => {
    const res = makeRes();
    await mediaController.getVideoThumbnail(makeReq({ params: { publicId: 'v.mp4' } }), res);
    expect(res.statusCode).toBe(503);
  });

  it('returns a video thumbnail via cloudinary (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.getVideoThumbnail.mockReturnValue('https://thumb.example.com/v.jpg');
    const res = makeRes();
    await mediaController.getVideoThumbnail(makeReq({ params: { publicId: 'v.mp4' } }), res);
    expect(res.body.thumbnailUrl).toBe('https://thumb.example.com/v.jpg');
  });

  it('runs a cleanup dry-run (happy path)', async () => {
    Message.find.mockResolvedValue([
      { mediaUrl: 'https://res.cloudinary.com/x/upload/v1/genz-whatsapp/image/keep.jpg', fileName: 'keep.jpg', media: null }
    ]);
    Conversation.find.mockResolvedValue([]);
    Status.find.mockResolvedValue([]);
    const res = makeRes();
    await mediaController.cleanupOrphanedFiles(makeReq({ query: { dryRun: 'true' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.cleanup.dryRun).toBe(true);
    expect(res.body.stats.usedCloudinaryPublicIds).toBe(1);
  });

  it('performs a real cleanup when dryRun=false (happy path)', async () => {
    Message.find.mockResolvedValue([]);
    Conversation.find.mockResolvedValue([]);
    Status.find.mockResolvedValue([]);
    const res = makeRes();
    await mediaController.cleanupOrphanedFiles(makeReq({ query: { dryRun: 'false' } }), res);
    expect(res.body.cleanup.dryRun).toBe(false);
    expect(res.body.message).toBe('Cleanup completed');
  });

  it('returns 500 when cleanup fails (error)', async () => {
    Message.find.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await mediaController.cleanupOrphanedFiles(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});
