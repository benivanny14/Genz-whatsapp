const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Status = require('../models/Status');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeUserProjection = [
  'username',
  'phoneNumber',
  'email',
  'emailVerified',
  'role',
  'isAdmin',
  'isBlocked',
  'isOnline',
  'status',
  'lastSeen',
  'premium',
  'subscriptionExpiresAt',
  'failedLoginAttempts',
  'lockUntil',
  'createdAt',
  'updatedAt'
].join(' ');

const isUserAdmin = (user) => Boolean(user?.isAdmin || user?.role === 'admin');

// --- Realtime bridge: admin page -> live system, and system -> admin page ---
const getIO = (req) => req.app.get('io');

/** Push an update to one specific user's active session(s) via Socket.IO. */
const notifyUser = (req, userId, event, payload) => {
  const io = getIO(req);
  if (io && userId) io.to(String(userId)).emit(event, payload);
};

/** Broadcast an update to every connected admin dashboard. */
const notifyAdmins = (req, event, payload) => {
  const io = getIO(req);
  if (io) io.to('role:admin').emit(event, payload);
};

/**
 * When an admin blocks a user, that user must lose access immediately —
 * not just on their next login. This force-disconnects any live socket
 * connections the user currently has, in addition to REST/JWT checks
 * already enforced by the auth middleware on the next request.
 */
const forceDisconnectUser = async (req, userId) => {
  const io = getIO(req);
  if (!io || !userId) return;
  try {
    await io.in(String(userId)).disconnectSockets(true);
  } catch (error) {
    console.error('Admin force-disconnect error:', error);
  }
};

const timingSafeTokenEqual = (provided = '', expected = '') => {
  const providedBuffer = Buffer.from(String(provided));
  const expectedBuffer = Buffer.from(String(expected));
  if (!providedBuffer.length || providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const getRevenueAggregate = () => Subscription.aggregate([
  { $match: { paymentStatus: 'completed' } },
  { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
]);

const buildUserFilter = ({ search, status }) => {
  const filter = {};
  const and = [];

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    and.push({ $or: [
      { username: pattern },
      { phoneNumber: pattern },
      { email: pattern }
    ] });
  }

  if (status === 'blocked') filter.isBlocked = true;
  if (status === 'online') filter.isOnline = true;
  if (status === 'premium') filter.premium = true;
  if (status === 'admin') and.push({ $or: [{ role: 'admin' }, { isAdmin: true }] });
  if (status === 'locked') filter.lockUntil = { $gt: new Date() };
  if (status === 'free') filter.premium = { $ne: true };
  if (and.length) filter.$and = and;

  return filter;
};

const getSystemHealthPayload = (req) => {
  const redisClient = req.app.get('redisClient');
  const memory = process.memoryUsage();

  return {
    success: true,
    status: mongoose.connection.readyState === 1 ? 'online' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient?.isOpen ? 'connected' : 'disabled'
    },
    runtime: {
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
      memoryMb: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
      }
    }
  };
};

exports.bootstrapAdmin = async (req, res) => {
  try {
    const configuredToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    const providedToken = req.headers['x-admin-bootstrap-token'] || req.body?.token;

    if (!configuredToken) {
      return res.status(503).json({
        success: false,
        message: 'Admin bootstrap token is not configured'
      });
    }

    if (!timingSafeTokenEqual(providedToken, configuredToken)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin bootstrap token'
      });
    }

    const existingAdmins = await User.countDocuments({
      $or: [{ role: 'admin' }, { isAdmin: true }]
    });

    if (existingAdmins > 0 && !isUserAdmin(req.user)) {
      return res.status(409).json({
        success: false,
        message: 'Admin bootstrap is closed because an admin already exists'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { role: 'admin', isAdmin: true } },
      { new: true, runValidators: true }
    ).select(safeUserProjection);

    await logAdminAction(
      user._id,
      'admin_bootstrap',
      { existingAdmins },
      user._id,
      null,
      req
    );

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Admin bootstrap error:', error);
    return res.status(500).json({ success: false, message: 'Failed to bootstrap admin' });
  }
};

exports.getOverview = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalUsers,
      newUsersToday,
      onlineUsers,
      blockedUsers,
      adminUsers,
      lockedUsers,
      premiumUsers,
      totalMessages,
      messagesToday,
      messagesThisWeek,
      totalConversations,
      groupConversations,
      activeStatuses,
      activeDevices,
      totalPayments,
      successfulPayments,
      pendingPayments,
      activeSubscriptions,
      revenueAgg,
      recentUsers,
      recentPayments,
      recentAuditLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ $or: [{ isOnline: true }, { status: 'online' }] }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ $or: [{ role: 'admin' }, { isAdmin: true }] }),
      User.countDocuments({ lockUntil: { $gt: now } }),
      User.countDocuments({ premium: true, subscriptionExpiresAt: { $gt: now } }),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: todayStart } }),
      Message.countDocuments({ createdAt: { $gte: weekStart } }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ isGroup: true }),
      Status.countDocuments({ expiresAt: { $gt: now } }),
      Device.countDocuments({ isActive: true }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ paymentStatus: 'completed' }),
      Subscription.countDocuments({ paymentStatus: 'pending' }),
      Subscription.countDocuments({ status: 'active', expiryDate: { $gt: now } }),
      getRevenueAggregate(),
      User.find().select(safeUserProjection).sort({ createdAt: -1 }).limit(8).lean(),
      Subscription.find().sort({ updatedAt: -1 }).limit(10).lean(),
      AuditLog.find().sort({ timestamp: -1 }).limit(10).lean()
    ]);

    return res.status(200).json({
      success: true,
      overview: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          online: onlineUsers,
          blocked: blockedUsers,
          admins: adminUsers,
          locked: lockedUsers,
          premium: premiumUsers
        },
        messaging: {
          totalMessages,
          messagesToday,
          messagesThisWeek,
          totalConversations,
          groupConversations,
          activeStatuses
        },
        payments: {
          totalPayments,
          successfulPayments,
          pendingPayments,
          failedPayments: Math.max(totalPayments - successfulPayments - pendingPayments, 0),
          activeSubscriptions,
          totalRevenue: revenueAgg[0]?.totalRevenue || 0
        },
        devices: {
          active: activeDevices
        },
        health: getSystemHealthPayload(req)
      },
      recentUsers,
      recentPayments,
      recentAuditLogs
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin overview' });
  }
};

exports.getHealth = async (req, res) => {
  return res.status(200).json(getSystemHealthPayload(req));
};

exports.listUsers = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 50, 1, 100);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all').trim();
    const filter = buildUserFilter({ search, status });

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select(safeUserProjection)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const updates = {};
    const isSelf = req.user?._id?.toString() === targetUserId;

    if (typeof req.body.isBlocked === 'boolean') {
      if (isSelf && req.body.isBlocked) {
        return res.status(400).json({ success: false, message: 'You cannot block your own admin account' });
      }
      updates.isBlocked = req.body.isBlocked;
    }

    if (typeof req.body.role === 'string') {
      if (!['user', 'admin'].includes(req.body.role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      if (isSelf && req.body.role !== 'admin') {
        return res.status(400).json({ success: false, message: 'You cannot demote your own admin account' });
      }
      updates.role = req.body.role;
      updates.isAdmin = req.body.role === 'admin';
    }

    if (typeof req.body.premium === 'boolean') {
      updates.premium = req.body.premium;
      updates.subscriptionExpiresAt = req.body.premium
        ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        : null;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No supported user updates supplied' });
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select(safeUserProjection);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAdminAction(req.user._id, 'user_updated', { updates }, user._id, null, req);

    // --- Push the change into the live system immediately ---
    // 1) Tell the affected user's own session(s) so their UI (premium badge,
    //    admin menu, block screen) updates without needing to reload.
    notifyUser(req, user._id, 'admin:account-updated', {
      userId: String(user._id),
      isBlocked: user.isBlocked,
      role: user.role,
      isAdmin: user.isAdmin,
      premium: user.premium,
      subscriptionExpiresAt: user.subscriptionExpiresAt
    });

    // 2) If they were just blocked, don't wait for their token to expire —
    //    kick any active socket connections right now.
    if (updates.isBlocked === true) {
      await forceDisconnectUser(req, user._id);
    }

    // 3) Let every other open admin dashboard know a user changed, so lists
    //    stay in sync across admins without waiting for the next poll.
    notifyAdmins(req, 'admin:user-changed', {
      userId: String(user._id),
      updates,
      updatedBy: String(req.user._id)
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Admin update user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.setUserBlock = async (req, res) => {
  req.body = req.body || {};
  req.body.isBlocked = req.params.action === 'block';
  return exports.updateUser(req, res);
};

exports.setUserAdminRole = async (req, res) => {
  req.body = req.body || {};
  req.body.role = req.params.action === 'promote' ? 'admin' : 'user';
  return exports.updateUser(req, res);
};

exports.getAuditLogs = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load audit logs' });
  }
};

exports.getSecurityReport = async (req, res) => {
  try {
    const now = new Date();
    const [lockedUsers, failedLoginUsers, blockedUsers, adminUsers, recentAuditLogs] = await Promise.all([
      User.find({ lockUntil: { $gt: now } }).select(safeUserProjection).sort({ lockUntil: -1 }).limit(20).lean(),
      User.find({ failedLoginAttempts: { $gt: 0 } }).select(safeUserProjection).sort({ lastFailedLoginAt: -1 }).limit(20).lean(),
      User.find({ isBlocked: true }).select(safeUserProjection).sort({ updatedAt: -1 }).limit(20).lean(),
      User.find({ $or: [{ role: 'admin' }, { isAdmin: true }] }).select(safeUserProjection).sort({ updatedAt: -1 }).limit(20).lean(),
      AuditLog.find().sort({ timestamp: -1 }).limit(20).lean()
    ]);

    return res.status(200).json({
      success: true,
      report: {
        lockedUsers,
        failedLoginUsers,
        blockedUsers,
        adminUsers,
        recentAuditLogs,
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          anonymousDeviceAuthEnabled: process.env.ALLOW_ANONYMOUS_DEVICE_AUTH === 'true',
          mockPaymentsEnabled: process.env.ALLOW_MOCK_PAYMENTS === 'true',
          realPaymentProvidersEnabled: process.env.ALLOW_REAL_PAYMENT_PROVIDERS === 'true',
          jwtRefreshSecretDistinct: Boolean(process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET !== process.env.JWT_SECRET),
          frontendUsesHttps: /^https:\/\//i.test(process.env.FRONTEND_URL || ''),
          publicApiUsesHttps: /^https:\/\//i.test(process.env.PUBLIC_API_URL || '')
        }
      }
    });
  } catch (error) {
    console.error('Admin security report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load security report' });
  }
};
