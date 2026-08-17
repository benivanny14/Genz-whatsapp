const Device = require('../models/Device');

const cleanDeviceId = (raw) => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value && value.length <= 128 ? value : '';
};

const getRequestDeviceId = (req) => cleanDeviceId(req.headers['x-device-id']);

const getDevicePlatform = (req) => {
  const header = req.headers['x-device-platform'];
  if (header && String(header).trim()) {
    return String(header).trim().slice(0, 60);
  }
  const ua = req.headers['user-agent'] || '';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Web';
};

const getDeviceBrowser = (req) => {
  const ua = req.headers['user-agent'] || '';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Browser';
};

const getDeviceName = (req) => {
  const explicit = req.headers['x-device-name'];
  if (explicit && String(explicit).trim()) {
    return String(explicit).trim().slice(0, 50);
  }
  const platform = getDevicePlatform(req);
  return platform && platform !== 'Unknown' ? platform : 'This device';
};

// Upsert an active device record so device-scoped tokens always have a record.
// Re-activates the device on every authenticated hit and refreshes metadata,
// but never overwrites a user-chosen name (renames are preserved).
//
// Keyed on deviceId ALONE (it has a unique index): a device belongs to one
// local user at a time, and if that user logs out and another account logs in
// on the same browser (same X-Device-ID), the record is re-assigned to the
// new owner. Keying on (localUserId, deviceId) instead made the upsert try to
// INSERT a second record with a taken deviceId -> E11000 duplicate key -> the
// token's deviceId claim could never match -> "logged out on this device" 401
// loop after every login on a reused browser.
const registerDevice = async (req, userId) => {
  const deviceId = getRequestDeviceId(req);
  if (!deviceId) return null;

  try {
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          localUserId: String(userId),
          isActive: true,
          lastActive: Date.now(),
          platform: getDevicePlatform(req),
          browser: getDeviceBrowser(req)
        },
        $setOnInsert: {
          deviceName: getDeviceName(req),
          deviceType: 'web'
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return device;
  } catch (error) {
    console.error('[DeviceSession] registerDevice error:', error);
    return null;
  }
};

// Check whether the device that owns a token is still active. Legacy tokens
// (no deviceId) are allowed so existing sessions keep working.
const isDeviceAllowed = async (decoded) => {
  if (!decoded || !decoded.id || !decoded.deviceId) {
    return true;
  }
  try {
    const device = await Device.findOne({
      localUserId: String(decoded.id),
      deviceId: String(decoded.deviceId)
    }).select('isActive');
    if (!device) {
      return false; // record removed -> device revoked
    }
    return Boolean(device.isActive);
  } catch (error) {
    // Fail open on DB errors so a storage issue does not lock everyone out.
    console.error('[DeviceSession] isDeviceAllowed error:', error);
    return true;
  }
};

module.exports = {
  getRequestDeviceId,
  registerDevice,
  isDeviceAllowed
};
