jest.mock('../models/User', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Message', () => ({
  countDocuments: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  countDocuments: jest.fn()
}));

jest.mock('../models/ManualPayment', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../models/Status', () => ({
  countDocuments: jest.fn()
}));

jest.mock('../models/Device', () => ({
  countDocuments: jest.fn()
}));

jest.mock('../models/AuditLog', () => ({
  find: jest.fn()
}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const ManualPayment = require('../models/ManualPayment');
const Status = require('../models/Status');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const { logAdminAction } = require('../utils/auditLogger');
const admin = require('../controllers/adminController');

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
  headers: {},
  user: { _id: 'admin-1', username: 'root', role: 'admin', isAdmin: true },
  app: { get: jest.fn(() => null) },
  ...overrides
});

// chainable: find() -> select() -> sort() -> skip() -> limit() -> lean()
const makeQuery = (value) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
  populate: jest.fn().mockReturnThis()
});

// findByIdAndUpdate() -> select() resolves directly (no lean() in the chain)
const makeFindByIdAndUpdate = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

describe('adminController — bootstrap', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 503 when no bootstrap token is configured', async () => {
    delete process.env.ADMIN_BOOTSTRAP_TOKEN;
    const res = makeRes();
    await admin.bootstrapAdmin(makeReq(), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.message).toBe('Admin bootstrap token is not configured');
  });

  it('rejects an invalid bootstrap token (403)', async () => {
    process.env.ADMIN_BOOTSTRAP_TOKEN = 'secret-token';
    const res = makeRes();
    await admin.bootstrapAdmin(makeReq({ headers: { 'x-admin-bootstrap-token': 'wrong' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Invalid admin bootstrap token');
  });

  it('promotes the user to admin (happy path)', async () => {
    process.env.ADMIN_BOOTSTRAP_TOKEN = 'secret-token';
    User.countDocuments.mockResolvedValue(0);
    const promoted = { _id: 'admin-1', username: 'root', role: 'admin', isAdmin: true };
    User.findByIdAndUpdate.mockReturnValue(makeFindByIdAndUpdate(promoted));
    const res = makeRes();
    await admin.bootstrapAdmin(makeReq({ headers: { 'x-admin-bootstrap-token': 'secret-token' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('admin');
    expect(logAdminAction).toHaveBeenCalled();
  });
});

describe('adminController — users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists users with pagination (happy path)', async () => {
    User.countDocuments.mockResolvedValue(100);
    User.find.mockReturnValue(makeQuery([{ _id: 'u1', username: 'alice' }]));
    const res = makeRes();
    await admin.listUsers(makeReq({ query: { page: '2', limit: '10' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.pagination.total).toBe(100);
    expect(res.body.pagination.pages).toBe(10);
  });

  it('clamps pagination values', async () => {
    User.countDocuments.mockResolvedValue(1);
    User.find.mockReturnValue(makeQuery([]));
    const res = makeRes();
    await admin.listUsers(makeReq({ query: { page: '99999', limit: '9999' } }), res);
    expect(res.body.pagination.page).toBe(10000);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('rejects blocking your own admin account (400)', async () => {
    const res = makeRes();
    await admin.updateUser(makeReq({ params: { userId: 'admin-1' }, body: { isBlocked: true } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You cannot block your own admin account');
  });

  it('rejects an invalid role (400)', async () => {
    const res = makeRes();
    await admin.updateUser(makeReq({ params: { userId: 'u1' }, body: { role: 'superuser' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid role');
  });

  it('rejects updates with no supported fields (400)', async () => {
    const res = makeRes();
    await admin.updateUser(makeReq({ params: { userId: 'u1' }, body: { avatar: 'x' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No supported user updates supplied');
  });

  it('returns 404 when updating a missing user', async () => {
    User.findByIdAndUpdate.mockReturnValue(makeFindByIdAndUpdate(null));
    const res = makeRes();
    await admin.updateUser(makeReq({ params: { userId: 'u1' }, body: { premium: true } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates a user (happy path)', async () => {
    User.findByIdAndUpdate.mockReturnValue(makeFindByIdAndUpdate({ _id: 'u1', isBlocked: true }));
    const res = makeRes();
    await admin.updateUser(makeReq({ params: { userId: 'u1' }, body: { isBlocked: true } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.user.isBlocked).toBe(true);
    expect(logAdminAction).toHaveBeenCalled();
  });

  it('setUserBlock delegates with the right flag', async () => {
    User.findByIdAndUpdate.mockReturnValue(makeFindByIdAndUpdate({ _id: 'u1', isBlocked: true }));
    const res = makeRes();
    await admin.setUserBlock(makeReq({ params: { userId: 'u1', action: 'block' } }), res);
    expect(res.body.user.isBlocked).toBe(true);
  });

  it('setUserAdminRole delegates with the right role', async () => {
    User.findByIdAndUpdate.mockReturnValue(makeFindByIdAndUpdate({ _id: 'u1', role: 'admin', isAdmin: true }));
    const res = makeRes();
    await admin.setUserAdminRole(makeReq({ params: { userId: 'u1', action: 'promote' } }), res);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('adminController — health, audit & security', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports system health (happy path)', async () => {
    const res = makeRes();
    await admin.getHealth(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBeDefined();
    expect(res.body.runtime.environment).toBe('test');
  });

  it('returns audit logs (happy path)', async () => {
    AuditLog.find.mockReturnValue(makeQuery([{ action: 'login' }]));
    const res = makeRes();
    await admin.getAuditLogs(makeReq({ query: { limit: '10' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.logs).toHaveLength(1);
  });

  it('builds a security report (happy path)', async () => {
    User.find.mockReturnValue(makeQuery([]));
    AuditLog.find.mockReturnValue(makeQuery([]));
    const res = makeRes();
    await admin.getSecurityReport(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.report.environment.nodeEnv).toBe('test');
    expect(res.body.report.lockedUsers).toEqual([]);
  });
});
