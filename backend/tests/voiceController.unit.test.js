jest.mock('../models/VoiceNote', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  find: jest.fn()
}));

jest.mock('../config/cloudinary', () => ({
  uploadFile: jest.fn(),
  getFileType: jest.fn(),
  isConfigured: jest.fn()
}));

jest.mock('../utils/publicBaseUrl', () => ({
  resolvePublicBaseUrl: jest.fn(() => 'http://localhost:5000')
}));

jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

const VoiceNote = require('../models/VoiceNote');
const cloudinary = require('../config/cloudinary');
const voice = require('../controllers/voiceController');

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
  user: { _id: 'user-1' },
  ...overrides
});

const makeNote = (overrides = {}) => ({
  _id: 'note-1',
  fileName: 'voice-1.mp3',
  originalName: 'memo.mp3',
  fileUrl: '/uploads/voice-1.mp3',
  publicId: 'voice-1.mp3',
  storageProvider: 'local',
  duration: 12.5,
  waveform: null,
  voiceEffect: 'none',
  fileSize: 2048,
  mimeType: 'audio/mpeg',
  createdAt: new Date(),
  ...overrides
});

describe('voiceController — upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 500 when authentication is missing and no file', async () => {
    cloudinary.isConfigured.mockReturnValue(false);
    const res = makeRes();
    await voice.uploadVoiceNote(makeReq({ user: {} }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('rejects upload without an audio file (validation)', async () => {
    const res = makeRes();
    await voice.uploadVoiceNote(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No audio file provided');
  });

  it('uploads to local storage (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(false);
    VoiceNote.create.mockResolvedValue(makeNote({ voiceEffect: 'chipmunk' }));
    const req = makeReq({
      file: { filename: 'voice-1.mp3', originalname: 'memo.mp3', size: 2048, mimetype: 'audio/mpeg', path: 'C:/tmp/voice-1.mp3' },
      body: { duration: '12.5', voiceEffect: 'chipmunk' }
    });
    const res = makeRes();
    await voice.uploadVoiceNote(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.voiceNote.fileUrl).toBe('http://localhost:5000/uploads/voice-1.mp3');
    expect(res.body.voiceNote.duration).toBe(12.5);
    expect(res.body.voiceNote.voiceEffect).toBe('chipmunk');
    expect(VoiceNote.create).toHaveBeenCalledWith(expect.objectContaining({ storageProvider: 'local', voiceEffect: 'chipmunk' }));
  });

  it('uploads via cloudinary when configured (happy path)', async () => {
    cloudinary.isConfigured.mockReturnValue(true);
    cloudinary.getFileType.mockReturnValue('audio');
    cloudinary.uploadFile.mockResolvedValue({ url: 'https://res.cloudinary.com/x/voice-1.mp3', publicId: 'cloud-1', storageProvider: 'cloudinary' });
    VoiceNote.create.mockResolvedValue(makeNote({ fileUrl: 'https://res.cloudinary.com/x/voice-1.mp3', publicId: 'cloud-1', storageProvider: 'cloudinary' }));
    const req = makeReq({
      file: { filename: 'voice-1.mp3', originalname: 'memo.mp3', size: 2048, mimetype: 'audio/mpeg', path: 'C:/tmp/voice-1.mp3' }
    });
    const res = makeRes();
    await voice.uploadVoiceNote(req, res);
    expect(res.statusCode).toBe(200);
    expect(cloudinary.uploadFile).toHaveBeenCalled();
    expect(res.body.voiceNote.fileUrl).toBe('https://res.cloudinary.com/x/voice-1.mp3');
  });

  it('still returns file info when DB creation fails', async () => {
    cloudinary.isConfigured.mockReturnValue(false);
    VoiceNote.create.mockRejectedValue(new Error('db down'));
    const req = makeReq({
      file: { filename: 'voice-1.mp3', originalname: 'memo.mp3', size: 2048, mimetype: 'audio/mpeg' }
    });
    const res = makeRes();
    await voice.uploadVoiceNote(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.voiceNote.id).toBeTruthy();
  });
});

describe('voiceController — get / list / update / delete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when the voice note is missing', async () => {
    VoiceNote.findOne.mockResolvedValue(null);
    const res = makeRes();
    await voice.getVoiceNote(makeReq({ params: { id: 'note-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns the voice note (happy path)', async () => {
    VoiceNote.findOne.mockResolvedValue(makeNote());
    const res = makeRes();
    await voice.getVoiceNote(makeReq({ params: { id: 'note-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.voiceNote.id).toBe('note-1');
    expect(res.body.voiceNote.fileUrl).toBe('http://localhost:5000/uploads/voice-1.mp3');
  });

  it('returns 404 when the query fails', async () => {
    VoiceNote.findOne.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await voice.getVoiceNote(makeReq({ params: { id: 'note-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a voice note (happy path)', async () => {
    VoiceNote.findOneAndDelete.mockResolvedValue(makeNote());
    const res = makeRes();
    await voice.deleteVoiceNote(makeReq({ params: { id: 'note-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('deleting an unknown note still succeeds (idempotent)', async () => {
    VoiceNote.findOneAndDelete.mockResolvedValue(null);
    const res = makeRes();
    await voice.deleteVoiceNote(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(200);
  });

  it('lists all voice notes (happy path)', async () => {
    VoiceNote.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([makeNote()]) });
    const res = makeRes();
    await voice.getAllVoiceNotes(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.voiceNotes).toHaveLength(1);
    expect(res.body.voiceNotes[0].id).toBe('note-1');
  });

  it('returns an empty list when the query fails', async () => {
    VoiceNote.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('db down')) });
    const res = makeRes();
    await voice.getAllVoiceNotes(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.voiceNotes).toEqual([]);
  });

  it('returns 404 when updating a missing note', async () => {
    VoiceNote.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    const res = makeRes();
    await voice.updateVoiceNote(makeReq({ params: { id: 'nope' }, body: { voiceEffect: 'robot' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates voice note metadata (happy path)', async () => {
    VoiceNote.findOneAndUpdate = jest.fn().mockResolvedValue(makeNote({ voiceEffect: 'robot' }));
    const res = makeRes();
    await voice.updateVoiceNote(makeReq({ params: { id: 'note-1' }, body: { voiceEffect: 'robot' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.voiceNote.voiceEffect).toBe('robot');
  });
});
