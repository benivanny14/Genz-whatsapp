/**
 * Enhanced device unlinking with token revocation.
 *
 * Wraps the existing unlinkDevice logic with proper token blacklisting
 * so the device can no longer make API calls after unlinking.
 *
 * Usage: Replace or wrap the existing unlinkDevice in deviceController.js
 */
const { revokeDeviceTokens } = require('./revokeDeviceTokens');

/**
 * Unlink a device with full token revocation.
 * @param {object} Device - Mongoose model
 * @param {string} userId - current user ID
 * @param {string} deviceId - device to unlink
 */
async function unlinkDeviceFull(Device, userId, deviceId) {
  // 1. Find the device first
  const device = await Device.findOne({ deviceId, localUserId: userId });
  if (!device) return { success: false, status: 404, message: 'Device not found' };

  // 2. Revoke all tokens for this device (blacklist in Redis + version bump)
  await revokeDeviceTokens(userId, deviceId);

  // 3. Delete the device record
  await Device.findOneAndDelete({ deviceId, localUserId: userId });

  return { success: true, status: 200, message: 'Device unlinked and tokens revoked' };
}

module.exports = { unlinkDeviceFull };
