const User = require('../models/User');
const Device = require('../models/Device');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (val, def, min, max) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

// ===========================================================================
// ROLES & PERMISSIONS
// -----------------------------------------------------------------------
// IMPORTANT: this is unrelated to the secure admin panel (that is owned
// exclusively by the AdminOwner account, see middleware/superAdminAuth.js).
// This is a lightweight, in-app permission-flag system for granting
// regular users elevated *in-product* capabilities (e.g. content
// moderation helpers) without ever giving them access to this dashboard.
// ===========================================================================
const AVAILABLE_PERMISSIONS = [
  { key: 'moderate_groups', label: 'Group content moderation' },
  { key: 'moderate_channels', label: 'Channel content moderation' },
  { key: 'view_reports', label: 'View abuse reports' },
  { key: 'verified_badge', label: 'Verified badge' }
];

exports.listPermissionOptions = async (req, res) => {
  res.json({ success: true, permissions: AVAILABLE_PERMISSIONS });
};

exports.listUsersWithPermissions = async (req, res) => {
  try {
    const users = await User.find({ appPermissions: { $exists: true, $ne: [] } })
      .select('username phoneNumber appPermissions')
      .limit(100)
      .lean();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load permissions' });
  }
};

exports.setUserPermissions = async (req, res) => {
  try {
    const { permissions } = req.body || {};
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions must be an array' });
    }
    const validKeys = new Set(AVAILABLE_PERMISSIONS.map((p) => p.key));
    const clean = permissions.filter((p) => validKeys.has(p));

    const user = await User.findByIdAndUpdate(req.params.userId, { appPermissions: clean }, { new: true })
      .select('username appPermissions');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await logAdminAction(req.admin.id, 'admin_set_user_permissions', { userId: req.params.userId, permissions: clean }, req.params.userId, null, req);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update permissions' });
  }
};

// ===========================================================================
// DEVICE MANAGEMENT (linked devices — QR pairing, multi-device)
// ===========================================================================
exports.listDevices = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const filter = {};
    if (req.query.userId) filter.localUserId = req.query.userId;

    const [total, devices] = await Promise.all([
      Device.countDocuments(filter),
      Device.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);
    res.json({ success: true, devices, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load devices' });
  }
};

exports.revokeDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
    await device.deleteOne();

    const io = req.app.get('io');
    if (io) io.to(String(device.localUserId)).emit('device:revoked', { deviceId: device.deviceId });

    await logAdminAction(req.admin.id, 'admin_revoked_device', { deviceId: device.deviceId, userId: device.localUserId }, device.localUserId, null, req);
    res.json({ success: true, message: 'Device revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke device' });
  }
};

// ===========================================================================
// SESSION MANAGEMENT (a User's activeSessions — logged-in JWT sessions,
// separate from linked Devices above)
// ===========================================================================
exports.listUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('username activeSessions').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, username: user.username, sessions: user.activeSessions || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load sessions' });
  }
};

exports.revokeUserSession = async (req, res) => {
  try {
    const { userId, sessionToken } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { activeSessions: { token: sessionToken } } },
      { new: true }
    ).select('username activeSessions');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const io = req.app.get('io');
    if (io) io.to(String(userId)).emit('session:revoked', { token: sessionToken });

    await logAdminAction(req.admin.id, 'admin_revoked_user_session', { userId }, userId, null, req);
    res.json({ success: true, sessions: user.activeSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
};

exports.revokeAllUserSessions = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { $set: { activeSessions: [] } }, { new: true })
      .select('username activeSessions');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const io = req.app.get('io');
    if (io) io.to(String(req.params.userId)).emit('session:revoked_all', {});

    await logAdminAction(req.admin.id, 'admin_revoked_all_user_sessions', { userId: req.params.userId }, req.params.userId, null, req);
    res.json({ success: true, message: 'All sessions revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
};
