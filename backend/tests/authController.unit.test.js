process.env.JWT_SECRET = 'test-jwt-secret-with-enough-length';
process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret';
process.env.NODE_ENV = 'test';
delete process.env.PHONE_VERIFICATION_REQUIRED;

jest.mock('../models/User', () => {
  const UserMock = jest.fn();
  UserMock.findById = jest.fn();
  UserMock.findOne = jest.fn();
  UserMock.findByIdAndUpdate = jest.fn();
  UserMock.findByIdAndDelete = jest.fn();
  UserMock.updateOne = jest.fn();
  UserMock.updateMany = jest.fn();
  UserMock.countDocuments = jest.fn();
  return UserMock;
});

jest.mock('../models/Device', () => ({
  updateOne: jest.fn().mockResolvedValue({}),
  findOneAndUpdate: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue({ isActive: true })
}));

jest.mock('../models/Message', () => ({
  updateMany: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({}),
  countDocuments: jest.fn().mockResolvedValue(0)
}));

jest.mock('../models/Conversation', () => ({
  updateMany: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({}),
  countDocuments: jest.fn().mockResolvedValue(0)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn()
}));

jest.mock('speakeasy', () => ({
  totp: { verify: jest.fn() }
}));

jest.mock('../services/otpDeliveryService', () => ({
  deliverOtp: jest.fn().mockResolvedValue({ delivered: 'none' })
}));

jest.mock('../utils/privacyHelper', () => ({
  applyPrivacyFilter: jest.fn((user) => Promise.resolve(user))
}));

jest.mock('../middleware/privacy', () => ({
  privacyMiddleware: jest.fn((req, res, next) => next()),
  filterUserData: jest.fn(),
  checkPrivacyPermission: jest.fn(() => true)
}));

jest.mock('../utils/contentFilter', () => ({
  containsProfanity: jest.fn(() => false)
}));

jest.mock('../utils/deviceSession', () => ({
  getRequestDeviceId: jest.fn(() => 'device-1'),
  registerDevice: jest.fn().mockResolvedValue(null),
  isDeviceAllowed: jest.fn().mockResolvedValue(true)
}));

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(() => ({ challenge: 'reg-challenge', rp: {} })),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(() => ({ challenge: 'login-challenge' })),
  verifyAuthenticationResponse: jest.fn()
}));

const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const Device = require('../models/Device');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { deliverOtp } = require('../services/otpDeliveryService');
const { applyPrivacyFilter } = require('../utils/privacyHelper');
const { checkPrivacyPermission } = require('../middleware/privacy');
const { containsProfanity } = require('../utils/contentFilter');
const { getRequestDeviceId, registerDevice, isDeviceAllowed } = require('../utils/deviceSession');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const auth = require('../controllers/authController');

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
  res.cookie = jest.fn();
  res.clearCookie = jest.fn();
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  cookies: {},
  app: { get: jest.fn(() => undefined) },
  user: { _id: 'user-1', username: 'alice', phoneNumber: '255700000001' },
  ...overrides
});

const makeUser = (overrides = {}) => {
  const user = {
    _id: 'user-1',
    username: 'alice',
    phoneNumber: '255700000001',
    role: 'user',
    status: 'offline',
    lastSeen: null,
    isOnline: false,
    failedLoginAttempts: 0,
    isAccountLocked: false,
    lockUntil: null,
    isBlocked: false,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    phoneVerified: false,
    phoneVerificationOTP: null,
    phoneVerificationOTPExpiry: null,
    resetOTP: null,
    resetOTPExpiry: null,
    changeNumberOTP: null,
    changeNumberOTPExpiry: null,
    changeNumberNewPhone: null,
    passkeys: [],
    passkeyRegisterChallenge: null,
    passkeyRegisterChallengeExpiry: null,
    passkeyLoginChallenge: null,
    passkeyLoginChallengeExpiry: null,
    settings: {},
    markModified: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    setPassword: jest.fn().mockResolvedValue(undefined),
    comparePassword: jest.fn().mockResolvedValue(true),
    incLoginAttempts: jest.fn(),
    resetLoginAttempts: jest.fn(),
    toSafeJSON() {
      const { save, setPassword, comparePassword, incLoginAttempts, resetLoginAttempts, markModified, toSafeJSON, ...plain } = this;
      return plain;
    },
    ...overrides
  };
  return user;
};

describe('authController — register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    containsProfanity.mockReturnValue(false);
  });

  it('rejects missing required fields (validation)', async () => {
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/required/);
  });

  it('rejects profane usernames (validation)', async () => {
    containsProfanity.mockReturnValue(true);
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'badword', phoneNumber: '255700000001', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects short passwords (validation)', async () => {
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice', phoneNumber: '255700000001', password: '123' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/at least 12 characters/);
  });

  it('rejects weak passwords that lack complexity (SECURITY 1.4)', async () => {
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice', phoneNumber: '255700000001', password: 'twelvechars123' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/uppercase, lowercase, number, and special character/);
  });

  it('rejects an existing username/phone with 409', async () => {
    User.findOne.mockResolvedValue(makeUser());
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice', phoneNumber: '255700000001', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(409);
  });

  it('registers a user and echoes the OTP in dev/test (happy path + regression guard)', async () => {
    const user = makeUser();
    User.mockImplementation((props = {}) => Object.assign(user, props));
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice', phoneNumber: '255700000001', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('signed-token');
    expect(res.body.refreshToken).toBe('signed-token');
    expect(res.body.phoneVerified).toBe(false);
    expect(res.body.requiresPhoneVerification).toBe(true);
    // The echoed OTP must be the one stored on the user (regression guard)
    expect(user.phoneVerificationOTP).toBe(res.body.phoneVerificationOTP);
    expect(user.phoneNumber).toBe('255700000001');
    expect(user.setPassword).toHaveBeenCalledWith('Password123!');
    expect(user.save).toHaveBeenCalled();
    expect(deliverOtp).toHaveBeenCalledWith('255700000001', res.body.phoneVerificationOTP, 'phone-verification');
    expect(res.cookie).toHaveBeenCalled();
  });

  it('skips the OTP gate when PHONE_VERIFICATION_REQUIRED=false', async () => {
    process.env.PHONE_VERIFICATION_REQUIRED = 'false';
    try {
      const user = makeUser();
      User.mockImplementation((props = {}) => Object.assign(user, props));
      User.findOne.mockResolvedValue(null);
      const res = makeRes();
      await auth.register(makeReq({ body: { username: 'alice', phoneNumber: '255700000001', password: 'Password123!' } }), res);
      expect(res.body.requiresPhoneVerification).toBe(false);
      expect(user.phoneVerified).toBe(true);
      expect(deliverOtp).not.toHaveBeenCalled();
    } finally {
      delete process.env.PHONE_VERIFICATION_REQUIRED;
    }
  });

  it('maps duplicate-key errors to 409 (validation)', async () => {
    User.findOne.mockResolvedValue(null);
    User.mockImplementation(() => {
      throw Object.assign(new Error('dup'), { code: 11000, keyPattern: { phoneNumber: 1 } });
    });
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice', phoneNumber: '255700000001', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/Phone number is already registered/);
  });
});

describe('authController — login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects missing credentials (validation)', async () => {
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects object identifiers (NoSQL injection guard)', async () => {
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: { $gt: '' }, password: 'x' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid input format');
  });

  it('returns 401 with a generic message when the user is not found', async () => {
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'nobody', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid login credentials');
  });

  it('blocks locked accounts with 423', async () => {
    const user = makeUser({ isAccountLocked: true, lockUntil: Date.now() + 60000 });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(423);
    expect(res.body.message).toMatch(/temporarily locked/);
  });

  it('blocks blocked accounts with 403', async () => {
    User.findOne.mockResolvedValue(makeUser({ isBlocked: true }));
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('This account is blocked');
  });

  it('rejects a wrong password, increments attempts, and warns near lockout', async () => {
    const user = makeUser({ failedLoginAttempts: 3, comparePassword: jest.fn().mockResolvedValue(false) });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'wrong' } }), res);
    expect(res.statusCode).toBe(401);
    expect(user.incLoginAttempts).toHaveBeenCalled();
    expect(res.body.warning).toBe('1 attempt(s) remaining before account lock');
  });

  it('logs in successfully by username (happy path)', async () => {
    const user = makeUser({ phoneVerified: true });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('signed-token');
    expect(res.body.phoneVerified).toBe(true);
    expect(user.lastSeen).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
    expect(registerDevice).toHaveBeenCalled();
  });

  it('retries with a normalized phone number when the raw id misses', async () => {
    const user = makeUser({ phoneVerified: true });
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: '+255 712-345-678', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(User.findOne).toHaveBeenLastCalledWith({ phoneNumber: '+255712345678' });
  });

  it('asks for 2FA when enabled and no token provided', async () => {
    User.findOne.mockResolvedValue(makeUser({ twoFactorEnabled: true }));
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.requiresTwoFactor).toBe(true);
  });

  it('rejects an invalid 2FA token with 401', async () => {
    speakeasy.totp.verify.mockReturnValue(false);
    const user = makeUser({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!', twoFactorToken: '000000' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid two-factor authentication token');
    expect(user.incLoginAttempts).toHaveBeenCalled();
  });

  it('accepts a valid 2FA token (happy path)', async () => {
    speakeasy.totp.verify.mockReturnValue(true);
    User.findOne.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', phoneVerified: true }));
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!', twoFactorToken: '123456' } }), res);
    expect(res.statusCode).toBe(200);
    expect(speakeasy.totp.verify).toHaveBeenCalledWith({ secret: 'SECRET', encoding: 'base32', token: '123456', window: 1 });
  });

  it('flags unverified phones when verification is required', async () => {
    const user = makeUser({ phoneVerified: false });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.phoneVerified).toBe(false);
    expect(res.body.requiresPhoneVerification).toBe(true);
  });

  it('auto-verifies existing accounts when the gate is disabled', async () => {
    process.env.PHONE_VERIFICATION_REQUIRED = 'false';
    try {
      const user = makeUser({ phoneVerified: false });
      User.findOne.mockResolvedValue(user);
      const res = makeRes();
      await auth.login(makeReq({ body: { identifier: 'alice', password: 'Password123!' } }), res);
      expect(res.body.phoneVerified).toBe(true);
      expect(user.phoneVerified).toBe(true);
      expect(user.save).toHaveBeenCalled();
    } finally {
      delete process.env.PHONE_VERIFICATION_REQUIRED;
    }
  });
});

describe('authController — session/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getMe returns the safe user (happy path)', async () => {
    const res = makeRes();
    await auth.getMe(makeReq({ user: makeUser({ phoneVerified: true }) }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('alice');
  });

  it('getMe auto-verifies when the gate is disabled', async () => {
    process.env.PHONE_VERIFICATION_REQUIRED = 'false';
    try {
      const user = makeUser({ phoneVerified: false });
      const res = makeRes();
      await auth.getMe(makeReq({ user }), res);
      expect(user.phoneVerified).toBe(true);
      expect(user.save).toHaveBeenCalled();
    } finally {
      delete process.env.PHONE_VERIFICATION_REQUIRED;
    }
  });

  it('updateProfile only updates whitelisted fields', async () => {
    User.findByIdAndUpdate.mockResolvedValue(makeUser({ phoneVerified: true, username: 'bob' }));
    const res = makeRes();
    await auth.updateProfile(makeReq({ body: { username: 'bob', phoneNumber: '999', about: 'hello' } }), res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-1',
      { $set: { username: 'bob', about: 'hello', bio: 'hello' } },
      { new: true, runValidators: true }
    );
    expect(res.body.user.username).toBe('bob');
  });

  it('updateProfile emits a socket event when io is present', async () => {
    const emit = jest.fn();
    const req = makeReq({
      body: { username: 'bob' },
      app: { get: jest.fn(() => ({ emit })) }
    });
    User.findByIdAndUpdate.mockResolvedValue(makeUser({ phoneVerified: true }));
    const res = makeRes();
    await auth.updateProfile(req, res);
    expect(emit).toHaveBeenCalledWith('profile:updated', expect.any(Object));
  });

  it('uploadProfilePicture rejects a missing file (validation)', async () => {
    const res = makeRes();
    await auth.uploadProfilePicture(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No image file provided');
  });

  it('uploadProfilePicture builds a public URL from the filename (happy path)', async () => {
    User.findByIdAndUpdate.mockResolvedValue(makeUser({ phoneVerified: true }));
    const req = makeReq({
      file: { path: '/tmp/uploads/x.png', filename: 'x.png' },
      get: (name) => (name === 'host' ? 'api.example.com' : undefined),
      protocol: 'https'
    });
    const res = makeRes();
    await auth.uploadProfilePicture(req, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { $set: { profilePicture: 'https://api.example.com/uploads/x.png' } }, { new: true });
    expect(res.body.success).toBe(true);
  });

  it('uploadProfilePicture keeps remote URLs as-is', async () => {
    User.findByIdAndUpdate.mockResolvedValue(makeUser({ phoneVerified: true }));
    const res = makeRes();
    await auth.uploadProfilePicture(makeReq({ file: { path: 'https://cdn.example.com/x.png', filename: '' } }), res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { $set: { profilePicture: 'https://cdn.example.com/x.png' } }, { new: true });
  });

  it('getSettings returns merged defaults (happy path)', async () => {
    const res = makeRes();
    await auth.getSettings(makeReq({ user: makeUser({ settings: { privacy: { lastSeen: 'nobody' } } }) }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.privacy.lastSeen).toBe('nobody');
    expect(res.body.settings.privacy.online).toBeDefined();
  });

  it('updateSettings returns 404 when the user is missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await auth.updateSettings(makeReq({ body: { settings: {} } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updateSettings merges incoming settings and stamps requestAccountInfoAt', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.updateSettings(makeReq({ body: { settings: { privacy: { lastSeen: 'contacts' }, account: { requestAccountInfoAt: 'now' } } } }), res);
    expect(user.settings.privacy.lastSeen).toBe('contacts');
    expect(user.settings.account.requestAccountInfoAt).toBeDefined();
    expect(user.markModified).toHaveBeenCalledWith('settings');
    expect(user.save).toHaveBeenCalled();
  });

  it('logout marks the user offline and revokes the device (happy path)', async () => {
    User.findByIdAndUpdate.mockResolvedValue({});
    Device.updateOne.mockResolvedValue({});
    const res = makeRes();
    await auth.logout(makeReq(), res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { isOnline: false, status: 'offline', lastSeen: expect.any(Date) });
    expect(Device.updateOne).toHaveBeenCalledWith(
      { localUserId: 'user-1', deviceId: 'device-1' },
      { $set: { isActive: false } }
    );
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });
});

describe('authController — changeNumber / changePassword / deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('changeNumber requires a new phone number (validation)', async () => {
    const res = makeRes();
    await auth.changeNumber(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('changeNumber rejects a number already in use', async () => {
    User.findOne.mockResolvedValue(makeUser());
    const res = makeRes();
    await auth.changeNumber(makeReq({ body: { newPhoneNumber: '255712345679' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Phone number already in use');
  });

  it('changeNumber step 1 issues an OTP and echoes it in dev (happy path)', async () => {
    User.findOne.mockResolvedValue(null);
    User.updateOne.mockResolvedValue({});
    const res = makeRes();
    await auth.changeNumber(makeReq({ body: { newPhoneNumber: '255712345679' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.requiresOtp).toBe(true);
    expect(res.body.otp).toMatch(/^\d{6}$/);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'user-1' },
      expect.objectContaining({ $set: expect.objectContaining({ changeNumberOTP: res.body.otp, changeNumberNewPhone: '255712345679' }) })
    );
    expect(deliverOtp).toHaveBeenCalledWith('255712345679', res.body.otp, 'change-number');
  });

  it('changeNumber step 2 verifies the OTP and updates the phone (happy path)', async () => {
    const user = makeUser({
      changeNumberOTP: '123456',
      changeNumberOTPExpiry: new Date(Date.now() + 60000),
      changeNumberNewPhone: '255712345679'
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.changeNumber(makeReq({ body: { newPhoneNumber: '255712345679', otp: '123456' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Phone number changed successfully');
    expect(user.phoneNumber).toBe('255712345679');
    expect(user.changeNumberOTP).toBeNull();
    expect(user.save).toHaveBeenCalled();
  });

  it('changeNumber rejects an expired OTP and clears it', async () => {
    const user = makeUser({
      changeNumberOTP: '123456',
      changeNumberOTPExpiry: new Date(Date.now() - 1000),
      changeNumberNewPhone: '255712345679'
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.changeNumber(makeReq({ body: { newPhoneNumber: '255712345679', otp: '123456' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('OTP expired or not requested');
    expect(user.changeNumberOTP).toBeNull();
  });

  it('changeNumber rejects an invalid OTP', async () => {
    const user = makeUser({
      changeNumberOTP: '123456',
      changeNumberOTPExpiry: new Date(Date.now() + 60000),
      changeNumberNewPhone: '255712345679'
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.changeNumber(makeReq({ body: { newPhoneNumber: '255712345679', otp: '999999' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid OTP');
  });

  it('changePassword validates inputs (validation)', async () => {
    let res = makeRes();
    await auth.changePassword(makeReq({ body: { newPassword: 'x' } }), res);
    expect(res.statusCode).toBe(400);

    res = makeRes();
    await auth.changePassword(makeReq({ body: { currentPassword: 'a', newPassword: 'short', confirmPassword: 'short' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/at least 12 characters/);

    res = makeRes();
    await auth.changePassword(makeReq({ body: { currentPassword: 'a', newPassword: 'LongEnough1!', confirmPassword: 'different' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Passwords do not match');

    res = makeRes();
    await auth.changePassword(makeReq({ body: { currentPassword: 'same', newPassword: 'same', confirmPassword: 'same' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('changePassword returns 404 for a missing user and 401 for a wrong current password', async () => {
    User.findById.mockResolvedValue(null);
    let res = makeRes();
    await auth.changePassword(makeReq({ body: { currentPassword: 'a', newPassword: 'LongEnough1!', confirmPassword: 'LongEnough1!' } }), res);
    expect(res.statusCode).toBe(404);

    User.findById.mockResolvedValue(makeUser({ comparePassword: jest.fn().mockResolvedValue(false) }));
    res = makeRes();
    await auth.changePassword(makeReq({ body: { currentPassword: 'wrong', newPassword: 'LongEnough1!', confirmPassword: 'LongEnough1!' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Current password is incorrect');
  });

  it('changePassword succeeds (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.changePassword(makeReq({ body: { currentPassword: 'OldPass1234!', newPassword: 'NewPass1234!', confirmPassword: 'NewPass1234!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(user.setPassword).toHaveBeenCalledWith('NewPass1234!');
    expect(user.save).toHaveBeenCalled();
  });

  it('deleteAccount returns 404 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await auth.deleteAccount(makeReq(), res);
    expect(res.statusCode).toBe(404);
  });

  it('deleteAccount hard-deletes messages, removes from conversations, and deletes the user (happy path, SECURITY 1.6)', async () => {
    User.findById.mockResolvedValue(makeUser());
    User.findByIdAndDelete.mockResolvedValue({});
    const res = makeRes();
    await auth.deleteAccount(makeReq(), res);
    expect(Message.deleteMany).toHaveBeenCalledWith({ sender: 'user-1' });
    expect(Conversation.updateMany).toHaveBeenCalledWith({ participants: 'user-1' }, { $pull: { participants: 'user-1', admins: 'user-1' } });
    expect(Conversation.deleteMany).toHaveBeenCalledWith({ participants: { $size: 1, $all: ['user-1'] } });
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('user-1');
    expect(res.body.message).toBe('Account deleted successfully');
  });

  it('getBlockedUsers returns 404 when user missing', async () => {
    User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await auth.getBlockedUsers(makeReq(), res);
    expect(res.statusCode).toBe(404);
  });

  it('getBlockedUsers applies privacy filtering (happy path)', async () => {
    const blocked = { _id: 'u9', username: 'bob' };
    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(makeUser({ blockedUsers: [blocked] }))
    });
    const res = makeRes();
    await auth.getBlockedUsers(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.blockedUsers).toHaveLength(1);
    expect(applyPrivacyFilter).toHaveBeenCalled();
  });
});

describe('authController — refreshToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDeviceAllowed.mockResolvedValue(true);
    jwt.verify.mockReset();
  });

  it('rejects a missing refresh token (validation)', async () => {
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid/expired token with 401', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'bad' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('rejects a token with the wrong type', async () => {
    jwt.verify.mockReturnValue({ typ: 'access', id: 'user-1' });
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('rejects refresh for blocked users', async () => {
    jwt.verify.mockReturnValue({ typ: 'refresh', id: 'user-1', iat: Math.floor(Date.now() / 1000) });
    User.findById.mockResolvedValue(makeUser({ isBlocked: true }));
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('User not authorized');
  });

  it('rejects tokens issued before a password change', async () => {
    jwt.verify.mockReturnValue({ typ: 'refresh', id: 'user-1', iat: Math.floor(Date.now() / 1000) });
    User.findById.mockResolvedValue(makeUser({ passwordChangedAt: new Date(Date.now() + 60000) }));
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Session expired. Please log in again.');
  });

  it('rejects refresh when the device is no longer active', async () => {
    jwt.verify.mockReturnValue({ typ: 'refresh', id: 'user-1', iat: Math.floor(Date.now() / 1000) });
    isDeviceAllowed.mockResolvedValue(false);
    User.findById.mockResolvedValue(makeUser({ phoneVerified: true }));
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Session has been logged out on this device');
  });

  it('issues new tokens on a valid refresh (happy path)', async () => {
    jwt.verify.mockReturnValue({ typ: 'refresh', id: 'user-1', iat: Math.floor(Date.now() / 1000) });
    User.findById.mockResolvedValue(makeUser({ phoneVerified: true }));
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('signed-token');
    expect(registerDevice).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalled();
  });

  it('rotates: bumps refreshTokenVersion and persists it (replay becomes impossible)', async () => {
    const user = makeUser({ phoneVerified: true, refreshTokenVersion: 0 });
    jwt.verify.mockReturnValue({ typ: 'refresh', id: 'user-1', version: 0, iat: Math.floor(Date.now() / 1000) });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(200);
    expect(user.refreshTokenVersion).toBe(1);
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects a replayed (stale-version) refresh token with 401', async () => {
    // Token was minted at version 0, but the user has already rotated to 1
    // (a previous refresh consumed the version-0 token) → replay rejected.
    jwt.verify.mockReturnValue({ typ: 'refresh', id: 'user-1', version: 0, iat: Math.floor(Date.now() / 1000) });
    User.findById.mockResolvedValue(makeUser({ phoneVerified: true, refreshTokenVersion: 1 }));
    const res = makeRes();
    await auth.refreshToken(makeReq({ body: { refreshToken: 'tok' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Session expired. Please log in again.');
  });
});

describe('authController — business profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('checkAvailability flags an existing phone with 409', async () => {
    User.findOne.mockResolvedValue(makeUser());
    const res = makeRes();
    await auth.checkAvailability(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.available).toBe(false);
  });

  it('checkAvailability flags an existing username with 409', async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser());
    const res = makeRes();
    await auth.checkAvailability(makeReq({ body: { phoneNumber: '255712345679', username: 'alice' } }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/Username is already taken/);
  });

  it('checkAvailability reports both free (happy path)', async () => {
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await auth.checkAvailability(makeReq({ body: { phoneNumber: '255712345679', username: 'newuser' } }), res);
    expect(res.body.available).toBe(true);
    expect(res.body.checked).toEqual(['phone', 'username']);
  });
});

describe('authController — online history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkPrivacyPermission.mockReturnValue(true);
  });

  it('getMyOnlineHistory returns the stored history (happy path)', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(makeUser({ onlineHistory: [1, 2, 3], lastSeen: new Date() }))
    });
    const res = makeRes();
    await auth.getMyOnlineHistory(makeReq(), res);
    expect(res.body.onlineHistory).toHaveLength(3);
    expect(res.body.lastSeen).toBeDefined();
  });

  it('getUserOnlineHistory returns 404 for a missing target user', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await auth.getUserOnlineHistory(makeReq({ params: { id: 'u9' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getUserOnlineHistory respects last_seen privacy (403)', async () => {
    checkPrivacyPermission.mockReturnValue(false);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeUser()) });
    const res = makeRes();
    await auth.getUserOnlineHistory(makeReq({ params: { id: 'u9' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('getUserOnlineHistory returns the last 50 sessions (happy path)', async () => {
    const history = Array.from({ length: 60 }, (_, i) => i);
    checkPrivacyPermission.mockReturnValue(true);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeUser({ onlineHistory: history })) });
    const res = makeRes();
    await auth.getUserOnlineHistory(makeReq({ params: { id: 'u9' } }), res);
    expect(res.body.onlineHistory).toHaveLength(50);
  });
});

describe('authController — passkeys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('checkPasskeyAvailable requires an identifier (validation)', async () => {
    const res = makeRes();
    await auth.checkPasskeyAvailable(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('checkPasskeyAvailable returns 404 for unknown users', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await auth.checkPasskeyAvailable(makeReq({ body: { username: 'nobody' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('checkPasskeyAvailable reports passkey count (happy path)', async () => {
    const user = makeUser({ passkeys: [{ credentialId: 'a' }, { credentialId: 'b' }] });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = makeRes();
    await auth.checkPasskeyAvailable(makeReq({ body: { username: 'alice' } }), res);
    expect(res.body.hasPasskeys).toBe(true);
    expect(res.body.passkeyCount).toBe(2);
  });

  it('passkeyRegisterOptions returns 404 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await auth.passkeyRegisterOptions(makeReq(), res);
    expect(res.statusCode).toBe(404);
  });

  it('passkeyRegisterOptions persists the challenge (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.passkeyRegisterOptions(makeReq({ body: { deviceName: 'Laptop' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.options.challenge).toBe('reg-challenge');
    expect(user.passkeyRegisterChallenge).toBe('reg-challenge');
    expect(user.passkeyRegisterChallengeExpiry).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
  });

  it('passkeyRegisterVerify rejects an expired/missing challenge (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await auth.passkeyRegisterVerify(makeReq({ body: { response: {} } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Registration challenge expired or missing');
  });

  it('passkeyRegisterVerify saves a verified passkey (happy path)', async () => {
    verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credentialPublicKey: Buffer.from('pubkey'),
        credentialID: Buffer.from('credid'),
        counter: 1
      }
    });
    const user = makeUser({
      passkeyRegisterChallenge: 'reg-challenge',
      passkeyRegisterChallengeExpiry: new Date(Date.now() + 60000)
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.passkeyRegisterVerify(makeReq({ body: { response: {}, deviceName: 'Laptop' } }), res);
    expect(res.body.message).toBe('Passkey registered successfully');
    expect(user.passkeys).toHaveLength(1);
    expect(user.passkeys[0].credentialId).toBe(Buffer.from('credid').toString('base64'));
    expect(user.passkeys[0].deviceName).toBe('Laptop');
    expect(user.passkeyRegisterChallenge).toBeNull();
    expect(user.save).toHaveBeenCalled();
  });

  it('passkeyLoginOptions requires an identifier (validation)', async () => {
    const res = makeRes();
    await auth.passkeyLoginOptions(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('passkeyLoginOptions returns 404 for unknown users', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await auth.passkeyLoginOptions(makeReq({ body: { username: 'nobody' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('passkeyLoginOptions rejects users without passkeys', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(makeUser()) });
    const res = makeRes();
    await auth.passkeyLoginOptions(makeReq({ body: { username: 'alice' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No passkeys registered for this user');
  });

  it('passkeyLoginOptions persists the login challenge (happy path)', async () => {
    const user = makeUser({ passkeys: [{ credentialId: 'a' }] });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = makeRes();
    await auth.passkeyLoginOptions(makeReq({ body: { username: 'alice' } }), res);
    expect(res.body.options.challenge).toBe('login-challenge');
    expect(user.passkeyLoginChallenge).toBe('login-challenge');
    expect(user.save).toHaveBeenCalled();
  });

  it('passkeyLoginVerify requires a userId (validation)', async () => {
    const res = makeRes();
    await auth.passkeyLoginVerify(makeReq({ body: { response: {} } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('passkeyLoginVerify returns 404 for unknown users', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await auth.passkeyLoginVerify(makeReq({ body: { userId: 'u9', response: {} } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('passkeyLoginVerify blocks blocked accounts', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeUser({ isBlocked: true })) });
    const res = makeRes();
    await auth.passkeyLoginVerify(makeReq({ body: { userId: 'user-1', response: {} } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('passkeyLoginVerify rejects an expired/missing challenge', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeUser()) });
    const res = makeRes();
    await auth.passkeyLoginVerify(makeReq({ body: { userId: 'user-1', response: {} } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('passkeyLoginVerify issues tokens after a successful verification (happy path)', async () => {
    verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 2, result: 'authStatus:passed' }
    });
    const user = makeUser({
      passkeys: [{ credentialId: 'cred-1', publicKey: Buffer.from('pub').toString('base64'), counter: 1, deviceName: 'Old' }],
      passkeyLoginChallenge: 'login-challenge',
      passkeyLoginChallengeExpiry: new Date(Date.now() + 60000)
    });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = makeRes();
    await auth.passkeyLoginVerify(makeReq({ body: { userId: 'user-1', response: { id: 'cred-1' }, deviceName: 'New Device' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('signed-token');
    expect(user.passkeys[0].counter).toBe(2);
    expect(user.passkeys[0].deviceName).toBe('New Device');
    expect(user.passkeyLoginChallenge).toBeNull();
    expect(user.save).toHaveBeenCalled();
  });

  it('getPasskeys lists passkeys (happy path)', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeUser({ passkeys: [{ credentialId: 'a' }] })) });
    const res = makeRes();
    await auth.getPasskeys(makeReq(), res);
    expect(res.body.passkeys).toHaveLength(1);
  });

  it('deletePasskey returns 404 when the passkey is not found', async () => {
    User.findById.mockResolvedValue(makeUser({ passkeys: [{ _id: 'pk1' }] }));
    const res = makeRes();
    await auth.deletePasskey(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Passkey not found');
  });

  it('deletePasskey removes a passkey (happy path)', async () => {
    const user = makeUser({ passkeys: [{ _id: 'pk1' }, { _id: 'pk2' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await auth.deletePasskey(makeReq({ params: { id: 'pk1' } }), res);
    expect(user.passkeys).toHaveLength(1);
    expect(user.passkeys[0]._id).toBe('pk2');
    expect(res.body.message).toBe('Passkey deleted successfully');
  });
});

describe('authController — password reset + phone OTP', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forgotPassword requires an identifier (validation)', async () => {
    const res = makeRes();
    await auth.forgotPassword(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('forgotPassword hides account existence for unknown users', async () => {
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await auth.forgotPassword(makeReq({ body: { emailOrPhone: 'nobody' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/If an account exists/);
    expect(res.body.otp).toBe('000000'); // dev/test placeholder
  });

  it('forgotPassword stores and echoes the OTP (happy path)', async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.forgotPassword(makeReq({ body: { emailOrPhone: 'alice' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.otp).toMatch(/^\d{6}$/);
    expect(user.resetOTP).toBe(res.body.otp);
    expect(user.resetOTPExpiry).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
    expect(deliverOtp).toHaveBeenCalled();
  });

  it('resetPassword validates inputs (validation)', async () => {
    let res = makeRes();
    await auth.resetPassword(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);

    res = makeRes();
    await auth.resetPassword(makeReq({ body: { emailOrPhone: 'alice', otp: '123456', newPassword: 'weak' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/at least 12 characters/);

    res = makeRes();
    await auth.resetPassword(makeReq({ body: { emailOrPhone: 'alice', otp: 'abc', newPassword: 'StrongPass1!' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid OTP format');
  });

  it('resetPassword rejects a user without a stored OTP', async () => {
    User.findOne.mockResolvedValue(makeUser());
    const res = makeRes();
    await auth.resetPassword(makeReq({ body: { emailOrPhone: 'alice', otp: '123456', newPassword: 'StrongPass1!' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid or expired OTP');
  });

  it('resetPassword clears and rejects an expired OTP', async () => {
    const user = makeUser({ resetOTP: '123456', resetOTPExpiry: new Date(Date.now() - 1000) });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.resetPassword(makeReq({ body: { emailOrPhone: 'alice', otp: '123456', newPassword: 'StrongPass1!' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('OTP has expired, please request a new one');
    expect(user.resetOTP).toBeNull();
  });

  it('resetPassword rejects a wrong OTP', async () => {
    const user = makeUser({ resetOTP: '123456', resetOTPExpiry: new Date(Date.now() + 60000) });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.resetPassword(makeReq({ body: { emailOrPhone: 'alice', otp: '999999', newPassword: 'StrongPass1!' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid OTP');
  });

  it('resetPassword succeeds and invalidates prior sessions (happy path)', async () => {
    const user = makeUser({ resetOTP: '123456', resetOTPExpiry: new Date(Date.now() + 60000), refreshToken: 'old' });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.resetPassword(makeReq({ body: { emailOrPhone: 'alice', otp: '123456', newPassword: 'StrongPass1!' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Password has been reset successfully');
    expect(user.setPassword).toHaveBeenCalledWith('StrongPass1!');
    expect(user.refreshToken).toBeNull();
    expect(user.fcmTokens).toEqual([]);
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
  });

  it('verifyPhoneOTP requires phone and otp (validation)', async () => {
    const res = makeRes();
    await auth.verifyPhoneOTP(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('verifyPhoneOTP rejects unknown numbers with a generic message', async () => {
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await auth.verifyPhoneOTP(makeReq({ body: { phoneNumber: '255700000001', otp: '123456' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid or expired OTP');
  });

  it('verifyPhoneOTP rejects a phone that does not match the session (403)', async () => {
    User.findOne.mockResolvedValue(makeUser({ phoneNumber: '255700000001' }));
    const res = makeRes();
    await auth.verifyPhoneOTP(makeReq({
      user: { _id: 'user-2', phoneNumber: '255999999999' },
      body: { phoneNumber: '255700000001', otp: '123456' }
    }), res);
    expect(res.statusCode).toBe(403);
  });

  it('verifyPhoneOTP rejects an expired OTP and clears it', async () => {
    const user = makeUser({ phoneVerificationOTP: '123456', phoneVerificationOTPExpiry: new Date(Date.now() - 1000) });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.verifyPhoneOTP(makeReq({ body: { phoneNumber: '255700000001', otp: '123456' } }), res);
    expect(res.statusCode).toBe(400);
    expect(user.phoneVerificationOTP).toBeNull();
  });

  it('verifyPhoneOTP rejects a wrong OTP', async () => {
    const user = makeUser({ phoneVerificationOTP: '123456', phoneVerificationOTPExpiry: new Date(Date.now() + 60000) });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.verifyPhoneOTP(makeReq({ body: { phoneNumber: '255700000001', otp: '999999' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid OTP');
  });

  it('verifyPhoneOTP verifies the phone (happy path)', async () => {
    const user = makeUser({ phoneVerificationOTP: '123456', phoneVerificationOTPExpiry: new Date(Date.now() + 60000) });
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.verifyPhoneOTP(makeReq({ body: { phoneNumber: '255700000001', otp: '123456' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Phone number verified successfully');
    expect(user.phoneVerified).toBe(true);
    expect(user.phoneVerificationOTP).toBeNull();
    expect(user.save).toHaveBeenCalled();
  });

  it('resendPhoneOTP requires a phone number (validation)', async () => {
    const res = makeRes();
    await auth.resendPhoneOTP(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('resendPhoneOTP returns 404 for unknown users', async () => {
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await auth.resendPhoneOTP(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('resendPhoneOTP rejects already-verified phones', async () => {
    User.findOne.mockResolvedValue(makeUser({ phoneVerified: true }));
    const res = makeRes();
    await auth.resendPhoneOTP(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Phone number already verified');
  });

  it('resendPhoneOTP stores and echoes a fresh OTP (happy path)', async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    const res = makeRes();
    await auth.resendPhoneOTP(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.otp).toMatch(/^\d{6}$/);
    expect(user.phoneVerificationOTP).toBe(res.body.otp);
    expect(deliverOtp).toHaveBeenCalledWith('255700000001', res.body.otp, 'phone-verification-resend');
  });
});
