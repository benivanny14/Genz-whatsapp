jest.mock('../models/User', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Device', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const User = require('../models/User');
const Device = require('../models/Device');
const { logAdminAction } = require('../utils/auditLogger');
const adminAccess = require('../controllers/adminAccessController');

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
  user: { _id: 'user-1' },
  admin: { id: 'admin-1' },
  app: { get: jest.fn(() => null) },
  ...overrides
});

describe('adminAccessController — permissions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists the available permission options (happy path)', async () => {
    const res = makeRes();
    await adminAccess.listPermissionOptions(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.permissions.map((p) => p.key)).toEqual([
      'moderate_groups', 'moderate_channels', 'view_reports', 'verified_badge'
    ]);
  });

  it('lists users that have permissions (happy path)', async () => {
    const users = [{ username: 'alice', appPermissions: ['view_reports'] }];
    const chain = { select: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(users) }) }) };
    User.find.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.listUsersWithPermissions(makeReq(), res);
    expect(User.find).toHaveBeenCalledWith({ appPermissions: { $exists: true, $ne: [] } });
    expect(res.body.users).toHaveLength(1);
  });

  it('returns 500 when listing users with permissions fails (error)', async () => {
    User.find.mockImplementation(() => {
      throw new Error('db down');
    });
    const res = makeRes();
    await adminAccess.listUsersWithPermissions(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

  it('rejects a non-array permissions payload (validation)', async () => {
    const res = makeRes();
    await adminAccess.setUserPermissions(makeReq({ body: { permissions: 'nope' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('filters unknown permission keys and updates the user (happy path)', async () => {
    const chain = { select: jest.fn().mockResolvedValue({ username: 'alice', appPermissions: ['view_reports'] }) };
    User.findByIdAndUpdate.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.setUserPermissions(
      makeReq({ params: { userId: 'u1' }, body: { permissions: ['view_reports', 'not_a_real_key'] } }),
      res
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { appPermissions: ['view_reports'] }, { new: true });
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'admin_set_user_permissions', expect.anything(), 'u1', null, expect.anything());
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the user is not found (auth)', async () => {
    const chain = { select: jest.fn().mockResolvedValue(null) };
    User.findByIdAndUpdate.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.setUserPermissions(makeReq({ params: { userId: 'missing' }, body: { permissions: [] } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 500 when updating permissions fails (error)', async () => {
    User.findByIdAndUpdate.mockImplementation(() => {
      throw new Error('db down');
    });
    const res = makeRes();
    await adminAccess.setUserPermissions(makeReq({ params: { userId: 'u1' }, body: { permissions: [] } }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminAccessController — devices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists devices with pagination (happy path)', async () => {
    Device.countDocuments.mockResolvedValue(35);
    const devices = [{ deviceId: 'd1' }];
    const chain = {
      sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(devices) }) }) })
    };
    Device.find.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.listDevices(makeReq({ query: { page: '2', limit: '30', userId: 'u1' } }), res);
    expect(res.body.pagination).toEqual({ page: 2, limit: 30, total: 35, pages: 2 });
    expect(res.body.devices).toHaveLength(1);
  });

  it('clamps out-of-range pagination values', async () => {
    Device.countDocuments.mockResolvedValue(5);
    const chain = {
      sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) })
    };
    Device.find.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.listDevices(makeReq({ query: { page: '0', limit: '500' } }), res);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('returns 500 when listing devices fails (error)', async () => {
    Device.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminAccess.listDevices(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

  it('revokes a device and emits socket event (happy path)', async () => {
    const device = {
      _id: 'd1',
      deviceId: 'dev-1',
      localUserId: 'u1',
      deleteOne: jest.fn().mockResolvedValue({})
    };
    Device.findById.mockResolvedValue(device);
    const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    const res = makeRes();
    await adminAccess.revokeDevice(makeReq({ params: { id: 'd1' }, app: { get: jest.fn(() => io) } }), res);
    expect(device.deleteOne).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith('u1');
    expect(logAdminAction).toHaveBeenCalledWith('admin-1', 'admin_revoked_device', expect.anything(), 'u1', null, expect.anything());
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the device is not found (auth)', async () => {
    Device.findById.mockResolvedValue(null);
    const res = makeRes();
    await adminAccess.revokeDevice(makeReq({ params: { id: 'missing' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 500 when revoking a device fails (error)', async () => {
    Device.findById.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await adminAccess.revokeDevice(makeReq({ params: { id: 'd1' } }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('adminAccessController — sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists a user\'s active sessions (happy path)', async () => {
    const chain = { select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ username: 'alice', activeSessions: [{ token: 't1' }] }) }) };
    User.findById.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.listUserSessions(makeReq({ params: { userId: 'u1' } }), res);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.username).toBe('alice');
  });

  it('returns 404 when the user is not found (auth)', async () => {
    const chain = { select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) };
    User.findById.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.listUserSessions(makeReq({ params: { userId: 'missing' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('revokes one session with socket event (happy path)', async () => {
    const chain = { select: jest.fn().mockResolvedValue({ username: 'alice', activeSessions: [] }) };
    User.findByIdAndUpdate.mockReturnValue(chain);
    const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    const res = makeRes();
    await adminAccess.revokeUserSession(
      makeReq({ params: { userId: 'u1', sessionToken: 'tok-1' }, app: { get: jest.fn(() => io) } }),
      res
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $pull: { activeSessions: { token: 'tok-1' } } }, { new: true });
    expect(io.to).toHaveBeenCalledWith('u1');
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when revoking a session for a missing user (auth)', async () => {
    const chain = { select: jest.fn().mockResolvedValue(null) };
    User.findByIdAndUpdate.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.revokeUserSession(makeReq({ params: { userId: 'missing', sessionToken: 'tok-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('revokes all sessions with socket event (happy path)', async () => {
    const chain = { select: jest.fn().mockResolvedValue({ username: 'alice', activeSessions: [] }) };
    User.findByIdAndUpdate.mockReturnValue(chain);
    const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    const res = makeRes();
    await adminAccess.revokeAllUserSessions(
      makeReq({ params: { userId: 'u1' }, app: { get: jest.fn(() => io) } }),
      res
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $set: { activeSessions: [] } }, { new: true });
    expect(res.body.message).toMatch(/revoked/i);
  });

  it('returns 404 when revoking all sessions for a missing user (auth)', async () => {
    const chain = { select: jest.fn().mockResolvedValue(null) };
    User.findByIdAndUpdate.mockReturnValue(chain);
    const res = makeRes();
    await adminAccess.revokeAllUserSessions(makeReq({ params: { userId: 'missing' } }), res);
    expect(res.statusCode).toBe(404);
  });
});
