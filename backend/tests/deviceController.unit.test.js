jest.mock('../models/Device', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

jest.mock('../utils/deviceSession', () => ({
  getRequestDeviceId: jest.fn(),
  registerDevice: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token')
}));

jest.mock('../config/secrets', () => ({
  JWT_SECRET: 'test-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret'
}));

const Device = require('../models/Device');
const User = require('../models/User');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const { getRequestDeviceId, registerDevice } = require('../utils/deviceSession');
const device = require('../controllers/deviceController');

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
  user: { _id: 'user-1', username: 'alice' },
  ip: '127.0.0.1',
  ...overrides
});

const makeDevice = (overrides = {}) => ({
  _id: 'd1',
  deviceId: 'dev-1',
  deviceName: 'Chrome',
  deviceType: 'web',
  platform: 'Windows',
  browser: 'Chrome',
  isActive: true,
  localUserId: 'user-1',
  pairingToken: 'tok-1',
  lastActive: Date.now(),
  createdAt: Date.now(),
  capabilities: {},
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

// getDevices calls Device.find({...}).sort({lastActive:-1})
const deviceFindChain = (result) => ({
  sort: jest.fn().mockResolvedValue(result)
});

beforeEach(() => jest.clearAllMocks());

describe('deviceController — generateQRCode', () => {
  it('throws 500 when the user is not authenticated (auth)', async () => {
    const res = makeRes();
    await device.generateQRCode(makeReq({ user: undefined }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Authentication required');
  });

  it('generates a QR code and pairing token (happy path)', async () => {
    const tempDevice = makeDevice({ deviceId: 'dev-new' });
    Device.create.mockResolvedValue(tempDevice);
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,QR');
    const res = makeRes();
    await device.generateQRCode(makeReq({ body: { deviceName: 'Phone' }, headers: { origin: 'http://app.local' } }), res);
    expect(Device.create).toHaveBeenCalledWith(expect.objectContaining({ localUserId: 'user-1', deviceName: 'Phone', isActive: false }));
    expect(QRCode.toDataURL).toHaveBeenCalledWith(expect.stringContaining('/pair-device?token='), expect.any(Object));
    expect(res.statusCode).toBe(200);
    expect(res.body.qrCode).toBe('data:image/png;base64,QR');
    expect(res.body.deviceId).toBe('dev-new');
    expect(res.body.expiresAt).toBeInstanceOf(Date);
  });

  it('returns null QR when generation fails (fallback)', async () => {
    Device.create.mockResolvedValue(makeDevice());
    QRCode.toDataURL.mockRejectedValue(new Error('no canvas'));
    const res = makeRes();
    await device.generateQRCode(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.qrCode).toBe(null);
    expect(res.body.pairingToken).toBeTruthy();
  });

  it('falls back to an in-memory device when DB create fails', async () => {
    Device.create.mockRejectedValue(new Error('db down'));
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,QR');
    const res = makeRes();
    await device.generateQRCode(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.deviceId).toBeTruthy();
    expect(res.body.pairingToken).toBeTruthy();
  });
});

describe('deviceController — pairDevice', () => {
  it('returns 400 when the pairing token is missing (validation)', async () => {
    const res = makeRes();
    await device.pairDevice(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Pairing token is required');
  });

  it('returns 404 for an unknown token', async () => {
    Device.findOne.mockResolvedValue(null);
    const res = makeRes();
    await device.pairDevice(makeReq({ body: { pairingToken: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Invalid or expired pairing token');
  });

  it('returns 410 and deletes the device when the token is expired', async () => {
    const expired = makeDevice({ createdAt: new Date(Date.now() - 10 * 60 * 1000) }); // 10 min old
    Device.findOne.mockResolvedValue(expired);
    Device.deleteOne.mockResolvedValue({});
    const res = makeRes();
    await device.pairDevice(makeReq({ body: { pairingToken: 'old' } }), res);
    expect(Device.deleteOne).toHaveBeenCalledWith({ _id: 'd1' });
    expect(res.statusCode).toBe(410);
    expect(res.body.message).toContain('expired');
  });

  it('returns 404 when the account is missing', async () => {
    const dev = makeDevice({ createdAt: new Date() });
    Device.findOne.mockResolvedValue(dev);
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await device.pairDevice(makeReq({ body: { pairingToken: 'tok-1' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Account for this pairing code was not found');
  });

  it('pairs a scanner device and issues login tokens (happy path with scanner)', async () => {
    const dev = makeDevice({ createdAt: new Date() });
    Device.findOne.mockResolvedValue(dev);
    User.findById.mockResolvedValue({ _id: 'user-1', role: 'user', isAdmin: false, toSafeJSON: () => ({ _id: 'user-1' }) });
    getRequestDeviceId.mockReturnValue('scanner-1');
    const res = makeRes();
    await device.pairDevice(makeReq({ body: { pairingToken: 'tok-1', deviceName: 'Scanner' } }), res);
    expect(Device.deleteOne).toHaveBeenCalledWith({ _id: 'd1' });
    expect(registerDevice).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBe('signed-token');
    expect(res.body.message).toBe('Device paired successfully');
  });

  it('activates the device when there is no scanner id (happy path without scanner)', async () => {
    const dev = makeDevice({ createdAt: new Date() });
    Device.findOne.mockResolvedValue(dev);
    User.findById.mockResolvedValue({ _id: 'user-1', role: 'user', isAdmin: false, toSafeJSON: () => ({ _id: 'user-1' }) });
    getRequestDeviceId.mockReturnValue(null);
    const res = makeRes();
    await device.pairDevice(makeReq({ body: { pairingToken: 'tok-1' } }), res);
    expect(dev.pairingToken).toBe(undefined);
    expect(dev.isActive).toBe(true);
    expect(dev.save).toHaveBeenCalled();
    expect(Device.deleteOne).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

describe('deviceController — getDevices', () => {
  it('returns an empty list when the user is not authenticated (auth, by design)', async () => {
    const res = makeRes();
    await device.getDevices(makeReq({ user: undefined }), res);
    // controller swallows all errors and returns 200 + empty devices
    expect(res.statusCode).toBe(200);
    expect(res.body.devices).toEqual([]);
  });

  it('returns an empty list when the DB query fails', async () => {
    Device.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('db down')) });
    const res = makeRes();
    await device.getDevices(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.devices).toEqual([]);
  });

  it('registers the current device when it is missing from the list', async () => {
    Device.find
      .mockReturnValueOnce(deviceFindChain([makeDevice({ deviceId: 'dev-1' })]))
      .mockReturnValueOnce(deviceFindChain([makeDevice({ deviceId: 'dev-1' }), makeDevice({ deviceId: 'dev-2' })]));
    const res = makeRes();
    await device.getDevices(makeReq({ headers: { 'x-device-id': 'dev-2' } }), res);
    expect(registerDevice).toHaveBeenCalled();
    expect(Device.find).toHaveBeenCalledTimes(2);
  });

  it('serializes devices and flags the current one (happy path)', async () => {
    Device.find.mockReturnValue(deviceFindChain([
      makeDevice({ deviceId: 'dev-1', deviceName: 'Chrome', isActive: true }),
      makeDevice({ deviceId: 'dev-2', deviceName: 'Phone', isActive: false })
    ]));
    const res = makeRes();
    await device.getDevices(makeReq({ headers: { 'x-device-id': 'dev-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.currentDeviceId).toBe('dev-1');
    expect(res.body.devices).toHaveLength(2);
    expect(res.body.devices[0].isCurrent).toBe(true);
    expect(res.body.devices[0].deviceName).toBe('Chrome');
    expect(res.body.devices[1].isCurrent).toBe(false);
  });
});

describe('deviceController — unlinkDevice', () => {
  it('returns 404 when the device is not found', async () => {
    Device.findOneAndDelete.mockResolvedValue(null);
    const res = makeRes();
    await device.unlinkDevice(makeReq({ params: { id: 'dev-9' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Device not found');
  });

  it('unlinks the device (happy path)', async () => {
    Device.findOneAndDelete.mockResolvedValue(makeDevice());
    const res = makeRes();
    await device.unlinkDevice(makeReq({ params: { id: 'dev-1' } }), res);
    expect(Device.findOneAndDelete).toHaveBeenCalledWith({ deviceId: 'dev-1', localUserId: 'user-1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('deviceController — updateDeviceActive', () => {
  it('returns 404 when the device is not found', async () => {
    Device.findOneAndUpdate.mockResolvedValue(null);
    const res = makeRes();
    await device.updateDeviceActive(makeReq({ params: { id: 'dev-9' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates the active status (happy path)', async () => {
    Device.findOneAndUpdate.mockResolvedValue(makeDevice());
    const res = makeRes();
    await device.updateDeviceActive(makeReq({ params: { id: 'dev-1' }, body: { isActive: false } }), res);
    expect(Device.findOneAndUpdate).toHaveBeenCalledWith(
      { deviceId: 'dev-1', localUserId: 'user-1' },
      expect.objectContaining({ isActive: false }),
      { new: true }
    );
    expect(res.statusCode).toBe(200);
  });

  it('defaults to active when no value is provided', async () => {
    Device.findOneAndUpdate.mockResolvedValue(makeDevice());
    const res = makeRes();
    await device.updateDeviceActive(makeReq({ params: { id: 'dev-1' } }), res);
    expect(Device.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ isActive: true }),
      { new: true }
    );
  });
});

describe('deviceController — logoutAllDevices', () => {
  it('logs out all devices except the current one (happy path)', async () => {
    Device.updateMany.mockResolvedValue({ modifiedCount: 2 });
    const res = makeRes();
    await device.logoutAllDevices(makeReq({ body: { currentDeviceId: 'dev-1' } }), res);
    expect(Device.updateMany).toHaveBeenCalledWith(
      { localUserId: 'user-1', deviceId: { $ne: 'dev-1' } },
      { isActive: false }
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.loggedOutCount).toBe(2);
    expect(res.body.message).toBe('Logged out 2 device(s)');
  });

  it('reports zero when nothing was modified', async () => {
    Device.updateMany.mockResolvedValue({ modifiedCount: 0 });
    const res = makeRes();
    await device.logoutAllDevices(makeReq(), res);
    expect(res.body.loggedOutCount).toBe(0);
    expect(res.body.message).toBe('Logged out 0 device(s)');
  });
});

describe('deviceController — updateDeviceCapabilities', () => {
  it('returns 404 when the device is not found', async () => {
    Device.findOneAndUpdate.mockResolvedValue(null);
    const res = makeRes();
    await device.updateDeviceCapabilities(makeReq({ params: { id: 'dev-9' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates capabilities (happy path)', async () => {
    Device.findOneAndUpdate.mockResolvedValue(makeDevice());
    const res = makeRes();
    await device.updateDeviceCapabilities(makeReq({ params: { id: 'dev-1' }, body: { voiceMessages: true } }), res);
    expect(Device.findOneAndUpdate).toHaveBeenCalledWith(
      { deviceId: 'dev-1', localUserId: 'user-1' },
      { capabilities: { voiceMessages: true } },
      { new: true }
    );
    expect(res.statusCode).toBe(200);
  });
});

describe('deviceController — renameDevice', () => {
  it('returns 400 for an empty name (validation)', async () => {
    const res = makeRes();
    await device.renameDevice(makeReq({ params: { id: 'dev-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Device name is required');
  });

  it('returns 400 for names longer than 50 chars (validation)', async () => {
    const res = makeRes();
    await device.renameDevice(makeReq({ params: { id: 'dev-1' }, body: { deviceName: 'x'.repeat(51) } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Device name must be 50 characters or less');
  });

  it('returns 404 when the device is not found', async () => {
    Device.findOneAndUpdate.mockResolvedValue(null);
    const res = makeRes();
    await device.renameDevice(makeReq({ params: { id: 'dev-9' }, body: { deviceName: 'New Name' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('renames the device and returns the serialized device (happy path)', async () => {
    Device.findOneAndUpdate.mockResolvedValue(makeDevice({ deviceName: 'New Name' }));
    const res = makeRes();
    await device.renameDevice(makeReq({ params: { id: 'dev-1' }, body: { deviceName: 'New Name' } }), res);
    expect(Device.findOneAndUpdate).toHaveBeenCalledWith(
      { deviceId: 'dev-1', localUserId: 'user-1' },
      expect.objectContaining({ deviceName: 'New Name' }),
      { new: true }
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.device.deviceName).toBe('New Name');
  });
});
