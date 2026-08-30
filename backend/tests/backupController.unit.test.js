// Ensure secrets module does not throw during module load
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-unit-tests';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-key-for-unit-tests';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-key-for-unit-tests';
process.env.MESSAGE_ENCRYPTION_SECRET = process.env.MESSAGE_ENCRYPTION_SECRET || 'test-encryption-key-for-unit-tests';
process.env.BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'test-backup-key-for-unit-tests';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{}'),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ mtime: new Date(), size: 100 }),
  unlink: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Status', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Broadcast', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/ManualPayment', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

const fs = require('fs/promises');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const ManualPayment = require('../models/ManualPayment');
const backup = require('../controllers/backupController');

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

const makeSortQuery = (value) => ({ sort: jest.fn().mockResolvedValue(value) });
const makeSelectQuery = (value) => ({ select: jest.fn().mockResolvedValue(value) });

const sampleData = {
  version: '2.0',
  timestamp: new Date().toISOString(),
  userId: 'user-1',
  data: {
    user: { _id: 'user-1', username: 'alice', passwordHash: 'secret' },
    conversations: [{ _id: 'c1', participants: ['user-1'] }],
    messages: [{ _id: 'm1', conversationId: 'c1' }],
    statuses: [],
    broadcasts: [],
    manualPayments: []
  },
  metadata: { totalConversations: 1, totalMessages: 1 }
};

describe('backupController — encryption helpers', () => {
  it('encrypts and decrypts a backup round-trip', () => {
    const encrypted = backup.encryptBackup(sampleData);
    expect(encrypted.algorithm).toBe('aes-256-gcm');
    expect(encrypted.encrypted).toBeTruthy();
    const decrypted = backup.decryptBackup(encrypted);
    expect(decrypted.userId).toBe('user-1');
    expect(decrypted.data.user.username).toBe('alice');
  });
});

describe('backupController — create/list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a local encrypted backup (happy path)', async () => {
    User.findById.mockReturnValue(makeSelectQuery({ _id: 'user-1', username: 'alice' }));
    Conversation.find.mockReturnValue(makeSortQuery([{ _id: 'c1', participants: ['user-1'] }]));
    Message.find.mockReturnValue(makeSortQuery([{ _id: 'm1', conversationId: 'c1' }]));
    Status.find.mockReturnValue(makeSortQuery([]));
    Broadcast.find.mockReturnValue(makeSortQuery([]));
    ManualPayment.find.mockReturnValue(makeSortQuery([]));
    User.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await backup.createBackup(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.storage).toBe('local');
    expect(res.body.backupId).toMatch(/^backup_user-1_/);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('lists local backups sorted by date (happy path)', async () => {
    fs.readdir.mockResolvedValue(['backup_user-1_a.json', 'backup_user-1_b.json', 'other.json']);
    fs.stat.mockResolvedValue({ mtime: new Date('2026-01-01'), size: 100 });
    const res = makeRes();
    await backup.listBackups(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(2);
    expect(res.body.storage).toBe('local');
  });

  it('returns 500 when listing fails', async () => {
    fs.readdir.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await backup.listBackups(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('backupController — restore/delete/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects restore without a backupId (validation)', async () => {
    const res = makeRes();
    await backup.restoreBackup(makeReq({ params: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Backup ID is required');
  });

  it('rejects restoring another user\'s backup (403)', async () => {
    const encrypted = backup.encryptBackup({ ...sampleData, userId: 'user-9' });
    fs.readFile.mockResolvedValue(JSON.stringify(encrypted));
    const res = makeRes();
    await backup.restoreBackup(makeReq({ params: { backupId: 'backup_user-1_x.json' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('This backup belongs to another user');
  });

  it('restores a backup owned by the user (happy path)', async () => {
    const encrypted = backup.encryptBackup(sampleData);
    fs.readFile.mockResolvedValue(JSON.stringify(encrypted));
    User.findByIdAndUpdate.mockResolvedValue({});
    Conversation.findByIdAndUpdate.mockResolvedValue({});
    Message.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await backup.restoreBackup(makeReq({ params: { backupId: 'backup_user-1_x.json' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Backup restored successfully');
    expect(Conversation.findByIdAndUpdate).toHaveBeenCalled();
    expect(Message.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('rejects deleting a backup that is not owned by the user (403)', async () => {
    const res = makeRes();
    await backup.deleteBackup(makeReq({ params: { backupId: 'backup_user-9_x.json' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deletes a local backup (happy path)', async () => {
    const res = makeRes();
    await backup.deleteBackup(makeReq({ params: { backupId: 'backup_user-1_x.json' } }), res);
    expect(res.body.success).toBe(true);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('schedules a backup (happy path)', async () => {
    User.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await backup.scheduleBackup(makeReq({ body: { interval: 'weekly', enabled: true } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.interval).toBe('weekly');
    expect(res.body.enabled).toBe(true);
  });

  it('returns backup status (happy path)', async () => {
    fs.readdir.mockResolvedValue(['backup_user-1_a.json']);
    fs.stat.mockResolvedValue({ mtime: new Date(), size: 100 });
    const res = makeRes();
    await backup.getBackupStatus(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.storage).toBe('local');
    expect(res.body.backupCount).toBe(1);
    expect(res.body.latestBackup).toBeDefined();
  });
});
