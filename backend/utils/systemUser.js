const User = require('../models/User');

const SYSTEM_DEVICE_ID = 'genz-system-admin-account';

/**
 * Returns the reserved "GENZ Support" User document used as the `sender`
 * for admin broadcasts and Admin <-> User chat messages (Message.sender
 * must be a User ObjectId — the real admin identity lives in the separate
 * AdminOwner collection and is never exposed to regular users).
 *
 * This account has no password, cannot log in through /api/auth, and is
 * excluded from all admin/user-management listings by convention (filter
 * out deviceId === SYSTEM_DEVICE_ID where relevant).
 */
async function getOrCreateSystemUser() {
  let systemUser = await User.findOne({ deviceId: SYSTEM_DEVICE_ID });
  if (!systemUser) {
    systemUser = await User.create({
      username: 'GENZ Support',
      phoneNumber: 'system-admin',
      deviceId: SYSTEM_DEVICE_ID,
      email: 'support@genz.local',
      status: 'online'
    });
  }
  return systemUser;
}

module.exports = { getOrCreateSystemUser, SYSTEM_DEVICE_ID };
