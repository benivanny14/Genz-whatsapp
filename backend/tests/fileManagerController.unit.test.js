jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const fileManager = require('../controllers/fileManagerController');

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
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  fileManagerSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeChainableFind = (value) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockResolvedValue(value)
});

describe('fileManagerController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await fileManager.getFileManagerSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ fileManagerSettings: { maxFileSize: 50 } }));
    const res = makeRes();
    await fileManager.getFileManagerSettings(makeReq(), res);
    expect(res.body.settings.maxFileSize).toBe(50);
    expect(res.body.settings.fileManagerEnabled).toBe(true); // default
    expect(res.body.settings.allowedFileTypes).toContain('pdf');
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await fileManager.updateFileManagerSettings(makeReq({ body: { settings: { autoOrganize: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.autoOrganize).toBe(true);
  });

  it('toggles the file manager (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await fileManager.toggleFileManager(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.fileManagerEnabled).toBe(false);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ fileManagerSettings: { fileManagerEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await fileManager.resetFileManagerSettings(makeReq(), res);
    expect(res.body.settings.fileManagerEnabled).toBe(true); // default
  });
});

describe('fileManagerController — files', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists user files (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    Message.find.mockReturnValue(makeChainableFind([
      { _id: 'm1', content: 'report.pdf', messageType: 'document', mediaUrl: 'https://x/r.pdf', conversationId: { _id: 'conv-1', name: 'Work' }, fileSize: 100, createdAt: new Date() }
    ]));
    Message.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    await fileManager.getUserFiles(makeReq({ query: {} }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.files[0].conversationName).toBe('Work');
    expect(res.body.total).toBe(1);
  });

  it('returns files by type (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    // Chain ends at .limit() (no .skip()) — limit must resolve the value.
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 'm1', messageType: 'image', mediaUrl: 'https://x/i.jpg', conversationId: { _id: 'conv-1', name: 'Chat' } }])
    });
    const res = makeRes();
    await fileManager.getFilesByType(makeReq({ params: { type: 'image' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.type).toBe('image');
    expect(res.body.files).toHaveLength(1);
  });

  it('computes file stats (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    Message.find.mockResolvedValue([
      { messageType: 'image', conversationId: 'conv-1', fileSize: 100 },
      { messageType: 'image', conversationId: 'conv-1', fileSize: 50 },
      { messageType: 'document', conversationId: 'conv-1', fileSize: 200 }
    ]);
    const res = makeRes();
    await fileManager.getFileStats(makeReq(), res);
    expect(res.body.stats.totalFiles).toBe(3);
    expect(res.body.stats.byType.image).toBe(2);
    expect(res.body.stats.byType.document).toBe(1);
    expect(res.body.stats.totalSize).toBe(350);
  });

  it('returns 404 when deleting a missing file', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await fileManager.deleteFile(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects deleting a file the user cannot access (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue({ _id: 'm1', conversationId: 'conv-1' });
    Conversation.findById.mockResolvedValue({ participants: ['user-9'] });
    const res = makeRes();
    await fileManager.deleteFile(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deletes a file (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const message = { _id: 'm1', conversationId: 'conv-1', mediaUrl: 'https://x/i.jpg', fileSize: 100, save: jest.fn().mockResolvedValue(undefined) };
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    const res = makeRes();
    await fileManager.deleteFile(makeReq({ params: { id: 'm1' } }), res);
    expect(res.body.success).toBe(true);
    expect(message.mediaUrl).toBeNull();
    expect(message.fileSize).toBe(0);
    expect(message.save).toHaveBeenCalled();
  });

  it('rejects sharing when file sharing is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ fileManagerSettings: { enableFileSharing: false } }));
    Message.findById.mockResolvedValue({ _id: 'm1' });
    const res = makeRes();
    await fileManager.shareFile(makeReq({ params: { id: 'm1' }, body: { conversationIds: ['conv-2'] } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects sharing without conversation ids (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue({ _id: 'm1' });
    const res = makeRes();
    await fileManager.shareFile(makeReq({ params: { id: 'm1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Conversation IDs are required');
  });

  it('shares a file to conversations (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue({ _id: 'm1', content: 'report', messageType: 'document', mediaUrl: 'https://x/r.pdf', fileSize: 100 });
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    Message.create.mockResolvedValue({ _id: 'm2' });
    const res = makeRes();
    await fileManager.shareFile(makeReq({ params: { id: 'm1' }, body: { conversationIds: ['conv-2', 'conv-3'] } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.shared).toBe(2);
    expect(res.body.failed).toBe(0);
    expect(Message.create).toHaveBeenCalledTimes(2);
  });

  it('reports conversations the user is not in as failed', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.findById.mockResolvedValue({ _id: 'm1', content: 'report', messageType: 'document', mediaUrl: 'https://x/r.pdf', fileSize: 100 });
    Conversation.findById.mockResolvedValue({ participants: ['user-9'] });
    const res = makeRes();
    await fileManager.shareFile(makeReq({ params: { id: 'm1' }, body: { conversationIds: ['conv-2'] } }), res);
    expect(res.body.shared).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].error).toBe('Not a participant');
  });
});
