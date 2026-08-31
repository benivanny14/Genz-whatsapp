const PushSubscription = require('../models/PushSubscription');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const getCurrentUserId = (req) => {
  if (!req.user?._id) {
    throw new Error('Authentication required');
  }
  return req.user._id.toString();
};

exports.getVapidPublicKey = (req, res) => {
  res.status(200).json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || ''
  });
};

exports.subscribe = async (req, res) => {
  try {
    const { subscription, endpoint, keys } = req.body;
    const payload = subscription || { endpoint, keys };

    if (!payload?.endpoint || !payload?.keys?.p256dh || !payload?.keys?.auth) {
      return res.status(400).json({
        success: false,
        message: 'A valid browser push subscription is required'
      });
    }

    const record = await PushSubscription.findOneAndUpdate(
      { endpoint: payload.endpoint },
      {
        $set: {
          userId: getCurrentUserId(req),
          endpoint: payload.endpoint,
          keys: payload.keys,
          deviceId: req.headers['x-device-id'] || req.body.deviceId || '',
          userAgent: req.headers['user-agent'] || '',
          enabled: true,
          lastSeenAt: new Date()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      subscription: record
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint is required' });
    }

    await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      { enabled: false, lastSeenAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'Push subscription disabled'
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listSubscriptions = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const subscriptions = await PushSubscription.find({ userId, enabled: true })
      .select('-keys.auth -keys.p256dh')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('List push subscriptions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── In-App Notification Center ────────────────────────────────────────

/**
 * GET /api/notifications/history — fetch notification history (unread + read).
 * Supports ?unread=true to return only unread, and ?page/limit pagination.
 */
exports.getNotificationHistory = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { unread, page = 1, limit = 30 } = req.query;

    const filter = { userId };
    if (unread === 'true') filter.isRead = false;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false })
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[Notification] getNotificationHistory error:', error);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

/**
 * POST /api/notifications/:id/read — mark a single notification as read.
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    console.error('[Notification] markAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

/**
 * POST /api/notifications/read-all — mark all notifications as read.
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, modified: result.modifiedCount });
  } catch (error) {
    console.error('[Notification] markAllAsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

/**
 * Helper: create a notification record and optionally emit via socket.
 * Used by other controllers (chatController, paymentController, etc.).
 */
exports.createNotification = async ({ userId, type, data = {} }) => {
  try {
    const notification = await Notification.create({ userId, type, data });
    return notification;
  } catch (error) {
    console.error('[Notification] createNotification error:', error);
    return null;
  }
};

exports.sendTestNotification = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const result = await notificationService.sendToUser(
      userId,
      {
        title: 'Genz Messenger',
        body: req.body?.body || 'Notifications are connected.',
        type: 'test',
        clickAction: '/'
      },
      { type: 'test' }
    );

    res.status(200).json({
      success: result.success,
      result
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
