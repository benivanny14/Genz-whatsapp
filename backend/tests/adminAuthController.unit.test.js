// Constructible mock: loginStep1's unknown-username path instantiates a dummy
// AdminOwner to burn an equivalent scrypt cost (timing anti-enumeration).
jest.mock('../models/AdminOwner', () => {
  class MockAdminOwner {
    constructor() {}
    async comparePassword() { return false; }
    async verifyRefreshToken() { return false; }
    async setRefreshToken() {}
    async clearRefreshToken() {}
    async registerSuccessfulLogin() {}
    async registerFailedAttempt() {}
    isLocked() { return false; }
  }
  MockAdminOwner.findOne = jest.fn();
  MockAdminOwner.find = jest.fn();
  MockAdminOwner.exists = jest.fn();
  return MockAdminOwner;
});

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

jest.mock('../middleware/superAdminAuth', () => ({
  signAccessToken: jest.fn(() => 'access-token'),
  signPre2FAToken: jest.fn(() => 'pre-auth-token'),
  ADMIN_JWT_SECRET: 'test-admin-jwt-secret-with-enough-length',
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  clientIp: jest.fn(() => '127.0.0.1')
}));

jest.mock('speakeasy', () => ({
  totp: { verify: jest.fn() }
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

const jwt = require('jsonwebtoken');

const AdminOwner = require('../models/AdminOwner');
const speakeasy = require('speakeasy');
const {
  loginStep1,
  loginStep2,
  refreshSession,
  logout
} = require('../controllers/adminAuthController');

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
  headers: {},
  ip: '127.0.0.1',
  ...overrides
});

const makeAdmin = (overrides = {}) => ({
  _id: 'admin-1',
  username: 'owner',
  totpEnabled: true,
  totpSecret: 'BASE32SECRET',
  lastLoginAt: null,
  isLocked: jest.fn(() => false),
  comparePassword: jest.fn(async () => true),
  registerFailedAttempt: jest.fn(async () => {}),
  registerSuccessfulLogin: jest.fn(async () => {}),
  setRefreshToken: jest.fn(async () => {}),
  verifyRefreshToken: jest.fn(() => true),
  clearRefreshToken: jest.fn(async () => {}),
  save: jest.fn(async () => {}),
  ...overrides
});

describe('adminAuthController — loginStep1', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects missing credentials with 400 (validation)', async () => {
    const res = makeRes();
    await loginStep1(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 503 when no owner account is provisioned at all', async () => {
    AdminOwner.findOne.mockResolvedValue(null);
    AdminOwner.exists.mockResolvedValue(false);
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'x', password: 'y' } }), res);
    expect(res.statusCode).toBe(503);
  });

  it('returns 401 for an unknown username when other owners exist (no enumeration leak)', async () => {
    AdminOwner.findOne.mockResolvedValue(null);
    AdminOwner.exists.mockResolvedValue(true);
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'ghost-user', password: 'anything' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('looks the owner up by username', async () => {
    AdminOwner.findOne.mockResolvedValue(makeAdmin());
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'owner', password: 'password' } }), res);
    expect(AdminOwner.findOne).toHaveBeenCalledWith({ username: 'owner' });
  });

  it('returns 423 when the account is locked', async () => {
    AdminOwner.findOne.mockResolvedValue(makeAdmin({ isLocked: jest.fn(() => true) }));
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'owner', password: 'password' } }), res);
    expect(res.statusCode).toBe(423);
  });

  it('returns 401 for bad credentials and records the failed attempt', async () => {
    const admin = makeAdmin({ comparePassword: jest.fn(async () => false) });
    AdminOwner.findOne.mockResolvedValue(admin);
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'owner', password: 'wrong' } }), res);
    expect(res.statusCode).toBe(401);
    expect(admin.registerFailedAttempt).toHaveBeenCalled();
  });

  it('requires 2FA when TOTP is enabled (happy path step 1)', async () => {
    AdminOwner.findOne.mockResolvedValue(makeAdmin());
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'owner', password: 'password' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresTwoFactor).toBe(true);
    expect(res.body.preAuthToken).toBe('pre-auth-token');
    expect(res.body.accessToken).toBeUndefined();
  });

  it('issues tokens directly when TOTP is disabled', async () => {
    AdminOwner.findOne.mockResolvedValue(makeAdmin({ totpEnabled: false }));
    const res = makeRes();
    await loginStep1(makeReq({ body: { username: 'owner', password: 'password' } }), res);
    expect(res.body.requiresTwoFactor).toBe(false);
    expect(res.body.accessToken).toBe('access-token');
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });
});

describe('adminAuthController — loginStep2 (2FA)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects missing preAuthToken/code with 400 (validation)', async () => {
    const res = makeRes();
    await loginStep2(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid pre-auth token with 401', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const res = makeRes();
    await loginStep2(makeReq({ body: { preAuthToken: 'garbage', code: '123456' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('rejects a wrong TOTP code with 401 and records the attempt', async () => {
    const admin = makeAdmin();
    AdminOwner.findById = jest.fn().mockResolvedValue(admin);
    AdminOwner.findOne.mockResolvedValue(admin);
    jwt.verify.mockReturnValue({ sub: 'admin-1', type: 'admin_2fa_pending' });
    speakeasy.totp.verify.mockReturnValue(false);
    const res = makeRes();
    await loginStep2(makeReq({ body: { preAuthToken: 'pre-auth-token', code: '000000' } }), res);
    expect(res.statusCode).toBe(401);
    expect(admin.registerFailedAttempt).toHaveBeenCalled();
  });

  it('issues access/refresh tokens after a valid TOTP (happy path)', async () => {
    const admin = makeAdmin();
    AdminOwner.findById = jest.fn().mockResolvedValue(admin);
    jwt.verify.mockReturnValue({ sub: 'admin-1', type: 'admin_2fa_pending' });
    speakeasy.totp.verify.mockReturnValue(true);
    const res = makeRes();
    await loginStep2(makeReq({ body: { preAuthToken: 'pre-auth-token', code: '123456' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBe('access-token');
    expect(admin.setRefreshToken).toHaveBeenCalled();
  });
});

describe('adminAuthController — refreshSession / logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing refresh token with 400 (validation)', async () => {
    const res = makeRes();
    await refreshSession(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid refresh token with 401', async () => {
    AdminOwner.find.mockResolvedValue([makeAdmin({ verifyRefreshToken: jest.fn(() => false) })]);
    const res = makeRes();
    await refreshSession(makeReq({ body: { refreshToken: 'bad' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('resolves the owner by its refresh token, not PRIMARY_OWNER', async () => {
    // Two owners hold refresh-token hashes; only the second matches the token.
    const other = makeAdmin({ _id: 'admin-other', verifyRefreshToken: jest.fn(() => false) });
    const admin = makeAdmin({ _id: 'admin-2', verifyRefreshToken: jest.fn(() => true) });
    AdminOwner.find.mockResolvedValue([other, admin]);
    const res = makeRes();
    await refreshSession(makeReq({ body: { refreshToken: 'per-spec-token' } }), res);
    expect(res.body.success).toBe(true);
    expect(admin.setRefreshToken).toHaveBeenCalled();
    expect(other.setRefreshToken).not.toHaveBeenCalled();
  });

  it('rotates the refresh token (happy path)', async () => {
    const admin = makeAdmin();
    AdminOwner.find.mockResolvedValue([admin]);
    const res = makeRes();
    await refreshSession(makeReq({ body: { refreshToken: 'good-token' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBe('access-token');
    expect(admin.setRefreshToken).toHaveBeenCalled();
  });

  it('rejects logout without a refresh token with 400 (no PRIMARY_OWNER fallback)', async () => {
    const res = makeRes();
    await logout(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('refreshToken is required');
    expect(AdminOwner.find).not.toHaveBeenCalled();
    expect(AdminOwner.findOne).not.toHaveBeenCalled();
  });

  it('logout with a refresh token clears THAT owner, not PRIMARY_OWNER', async () => {
    const admin = makeAdmin({ _id: 'admin-2' });
    AdminOwner.find.mockResolvedValue([admin]);
    const res = makeRes();
    await logout(makeReq({ body: { refreshToken: 'per-spec-token' } }), res);
    expect(admin.clearRefreshToken).toHaveBeenCalled();
    expect(AdminOwner.findOne).not.toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('logout with an unknown refresh token returns 401', async () => {
    AdminOwner.find.mockResolvedValue([]);
    const res = makeRes();
    await logout(makeReq({ body: { refreshToken: 'stale-token' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token');
  });
});
