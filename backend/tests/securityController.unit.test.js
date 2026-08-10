jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: { verify: jest.fn() }
}));

const User = require('../models/User');
const QRCode = require('qrcode');
const speakeasy = require('speakeasy');
const security = require('../controllers/securityController');

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
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  phoneNumber: '255700000001',
  twoFactorSecret: null,
  twoFactorEnabled: false,
  twoFactorVerified: false,
  securitySettings: {},
  securityModsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('securityController — 2FA', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await security.generateTwoFactorSecret(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('generates a 2FA secret and QR code (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    speakeasy.generateSecret.mockReturnValue({
      base32: 'BASE32SECRET',
      otpauth_url: 'otpauth://totp/GENZ?secret=BASE32SECRET'
    });
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,AAAA');

    const res = makeRes();
    await security.generateTwoFactorSecret(makeReq(), res);

    expect(user.twoFactorSecret).toBe('BASE32SECRET');
    expect(user.twoFactorVerified).toBe(false);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.secret).toBe('BASE32SECRET');
    expect(res.body.qrCode).toMatch(/^data:image\/png/);
  });

  it('rejects verifying 2FA without a token (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await security.verifyTwoFactorToken(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('2FA token and secret are required');
  });

  it('rejects an invalid 2FA token', async () => {
    User.findById.mockResolvedValue(makeUser({ twoFactorSecret: 'BASE32SECRET' }));
    speakeasy.totp.verify.mockReturnValue(false);
    const res = makeRes();
    await security.verifyTwoFactorToken(makeReq({ body: { token: '000000' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid 2FA token');
  });

  it('enables 2FA after a valid token (happy path)', async () => {
    const user = makeUser({ twoFactorSecret: 'BASE32SECRET' });
    User.findById.mockResolvedValue(user);
    speakeasy.totp.verify.mockReturnValue(true);
    const res = makeRes();
    await security.verifyTwoFactorToken(makeReq({ body: { token: '123456' } }), res);
    expect(user.twoFactorEnabled).toBe(true);
    expect(user.twoFactorVerified).toBe(true);
    expect(res.body.twoFactorEnabled).toBe(true);
  });

  it('requires a valid token to disable 2FA once enabled', async () => {
    const user = makeUser({ twoFactorSecret: 'BASE32SECRET', twoFactorEnabled: true });
    User.findById.mockResolvedValue(user);
    speakeasy.totp.verify.mockReturnValue(false);
    const res = makeRes();
    await security.disableTwoFactor(makeReq({ body: { token: '000000' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Valid 2FA token is required');
  });

  it('disables 2FA with a valid token (happy path)', async () => {
    const user = makeUser({ twoFactorSecret: 'BASE32SECRET', twoFactorEnabled: true });
    User.findById.mockResolvedValue(user);
    speakeasy.totp.verify.mockReturnValue(true);
    const res = makeRes();
    await security.disableTwoFactor(makeReq({ body: { token: '123456' } }), res);
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.twoFactorSecret).toBeNull();
    expect(res.body.twoFactorEnabled).toBe(false);
  });

  it('rejects 2FA login without userId/token (validation)', async () => {
    const res = makeRes();
    await security.verifyTwoFactorLogin(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for 2FA login when 2FA is not enabled', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await security.verifyTwoFactorLogin(makeReq({ body: { userId: 'user-1', token: '123456' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('2FA is not enabled for this user');
  });

  it('verifies a 2FA login token (happy path)', async () => {
    const user = makeUser({ twoFactorSecret: 'BASE32SECRET', twoFactorEnabled: true });
    User.findById.mockResolvedValue(user);
    speakeasy.totp.verify.mockReturnValue(true);
    const res = makeRes();
    await security.verifyTwoFactorLogin(makeReq({ body: { userId: 'user-1', token: '123456' } }), res);
    expect(res.body).toEqual({ success: true, verified: true });
  });

  it('returns security settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true }));
    const res = makeRes();
    await security.getSecuritySettings(makeReq(), res);
    expect(res.body.settings.twoFactorEnabled).toBe(true);
  });

  it('updates only whitelisted security settings (validation)', async () => {
    const user = makeUser({ securitySettings: { loginAlerts: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await security.updateSecuritySettings(makeReq({ body: { loginAlerts: true, evilField: 'x' } }), res);
    expect(user.securitySettings.loginAlerts).toBe(true);
    expect(user.securitySettings.evilField).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });

  it('reports 2FA status (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorVerified: true }));
    const res = makeRes();
    await security.getTwoFactorStatus(makeReq(), res);
    expect(res.body.twoFactorEnabled).toBe(true);
  });
});

describe('securityController — security MODs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns MODs settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ securityModsSettings: { antiBanProtection: true } }));
    const res = makeRes();
    await security.getSecurityModsSettings(makeReq(), res);
    expect(res.body.settings.antiBanProtection).toBe(true);
    expect(res.body.settings.proxySupport).toBe(false); // default
  });

  it('updates MODs settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await security.updateSecurityModsSettings(makeReq({ body: { settings: { vpnMode: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.vpnMode).toBe(true);
  });

  it('toggles a single MOD (happy path)', async () => {
    const user = makeUser({ securityModsSettings: { ipSpoofing: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await security.toggleIPSpoofing(makeReq(), res);
    expect(res.body.ipSpoofing).toBe(true);
  });

  it('toggles a different MOD independently', async () => {
    const user = makeUser({ securityModsSettings: { appLockFace: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await security.toggleAppLockFace(makeReq(), res);
    expect(res.body.appLockFace).toBe(false);
  });

  it('toggles VPN with an explicit region (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await security.toggleVPN(makeReq({ body: { enabled: true, region: 'europe' } }), res);
    expect(res.body.vpnMode).toBe(true);
    expect(res.body.vpnRegion).toBe('europe');
  });

  it('falls back to the previous region for an invalid one (validation)', async () => {
    const user = makeUser({ securityModsSettings: { vpnRegion: 'africa' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await security.toggleVPN(makeReq({ body: { enabled: true, region: 'mars' } }), res);
    expect(res.body.vpnRegion).toBe('africa');
  });

  it('returns VPN status with available regions (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ securityModsSettings: { vpnMode: true, vpnRegion: 'usa' } }));
    const res = makeRes();
    await security.getVPNStatus(makeReq(), res);
    expect(res.body.vpn.enabled).toBe(true);
    expect(res.body.vpn.region).toBe('usa');
    expect(res.body.vpn.regions).toContain('auto');
  });
});
