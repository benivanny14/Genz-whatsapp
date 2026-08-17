jest.mock('../models/Device', () => ({
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn()
}));

const Device = require('../models/Device');
const { registerDevice, isDeviceAllowed } = require('../utils/deviceSession');

const makeReq = (deviceId = 'dev-123', extra = {}) => ({
  headers: {
    'x-device-id': deviceId,
    'x-device-platform': 'Windows',
    'user-agent': 'Mozilla/5.0 Chrome/120',
    ...extra
  }
});

describe('deviceSession.registerDevice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when no device id header is present', async () => {
    const result = await registerDevice(makeReq(''), 'user-1');
    expect(result).toBeNull();
    expect(Device.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keys the upsert on deviceId alone and assigns the owner', async () => {
    const fakeDevice = { deviceId: 'dev-123', localUserId: 'user-1', isActive: true };
    Device.findOneAndUpdate.mockResolvedValue(fakeDevice);

    const result = await registerDevice(makeReq('dev-123'), 'user-1');

    expect(Device.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = Device.findOneAndUpdate.mock.calls[0];
    // Filter is on deviceId only (unique index) — NOT on (localUserId, deviceId),
    // which previously caused an E11000 duplicate-key 401 loop when a browser
    // switched accounts (stale device id owned by the previous user).
    expect(filter).toEqual({ deviceId: 'dev-123' });
    expect(update.$set.localUserId).toBe('user-1');
    expect(update.$set.isActive).toBe(true);
    expect(options.upsert).toBe(true);
    expect(result).toBe(fakeDevice);
  });

  it('re-assigns an existing device to the new owner when another user logs in', async () => {
    const fakeDevice = { deviceId: 'dev-123', localUserId: 'user-2', isActive: true };
    Device.findOneAndUpdate.mockResolvedValue(fakeDevice);

    const result = await registerDevice(makeReq('dev-123'), 'user-2');

    expect(Device.findOneAndUpdate.mock.calls[0][0]).toEqual({ deviceId: 'dev-123' });
    expect(Device.findOneAndUpdate.mock.calls[0][1].$set.localUserId).toBe('user-2');
    expect(result.localUserId).toBe('user-2');
  });

  it('returns null and swallows DB errors (fail-open logging)', async () => {
    Device.findOneAndUpdate.mockRejectedValue(new Error('mongo down'));
    const result = await registerDevice(makeReq('dev-123'), 'user-1');
    expect(result).toBeNull();
  });
});

describe('deviceSession.isDeviceAllowed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows legacy tokens without a deviceId claim', async () => {
    await expect(isDeviceAllowed({ id: 'u1' })).resolves.toBe(true);
    await expect(isDeviceAllowed(null)).resolves.toBe(true);
  });

  const findOneWithSelect = (value) => {
    Device.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(value) });
  };

  it('rejects when the device record is missing', async () => {
    findOneWithSelect(null);
    await expect(isDeviceAllowed({ id: 'u1', deviceId: 'dev-9' })).resolves.toBe(false);
  });

  it('allows when the device record is active', async () => {
    findOneWithSelect({ isActive: true });
    await expect(isDeviceAllowed({ id: 'u1', deviceId: 'dev-9' })).resolves.toBe(true);
  });

  it('rejects when the device record is inactive', async () => {
    findOneWithSelect({ isActive: false });
    await expect(isDeviceAllowed({ id: 'u1', deviceId: 'dev-9' })).resolves.toBe(false);
  });
});
