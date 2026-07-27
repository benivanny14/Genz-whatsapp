const Broadcast = require('../models/Broadcast');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const PushSubscription = require('../models/PushSubscription');
const notificationService = require('../services/notificationService');
const { getOrCreateSystemUser, SYSTEM_DEVICE_ID } = require('../utils/systemUser');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (val, def, min, max) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

// ===========================================================================
// BROADCAST SYSTEM (admin oversight of user-created broadcast lists, plus
// admin-initiated system-wide announcements sent as "GENZ Support")
// ===========================================================================
exports.listBroadcasts = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const [total, broadcasts] = await Promise.all([
      Broadcast.countDocuments(),
      Broadcast.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);
    res.json({ success: true, broadcasts, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load broadcasts' });
  }
};

exports.deleteBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    await broadcast.deleteOne();
    await logAdminAction(req.admin.id, 'admin_deleted_broadcast', { broadcastId: req.params.id }, null, null, req);
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete broadcast' });
  }
};

// Admin-initiated system-wide (or segmented) announcement. Sent as normal
// chat messages from the reserved "GENZ Support" account so users see it
// in their chat list like any other conversation.
exports.sendSystemAnnouncement = async (req, res) => {
  try {
    const { content, segment = 'all' } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const filter = { deviceId: { $ne: SYSTEM_DEVICE_ID } };
    if (segment === 'premium') filter.premium = true;
    if (segment === 'free') filter.premium = { $ne: true };
    if (segment === 'blocked') filter.isBlocked = true;

    const recipients = await User.find(filter).select('_id').lean();
    const systemUser = await getOrCreateSystemUser();
    const io = req.app.get('io');

    let sent = 0;
    for (const { _id: recipientId } of recipients) {
      try {
        let conversation = await Conversation.findOne({
          participants: { $all: [systemUser._id, recipientId] },
          isGroup: false
        });
        if (!conversation) {
          conversation = await Conversation.create({ participants: [systemUser._id, recipientId], isGroup: false });
        }
        const message = await Message.create({
          conversationId: conversation._id,
          sender: systemUser._id,
          content: content.trim(),
          messageType: 'system'
        });
        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        if (io) io.to(String(recipientId)).emit('newMessage', message);
        sent++;
      } catch (err) {
        console.error(`[AdminBroadcast] failed to message ${recipientId}:`, err.message);
      }
    }

    await logAdminAction(req.admin.id, 'admin_sent_system_announcement', { segment, recipientCount: sent }, null, null, req);
    res.json({ success: true, message: `Announcement sent to ${sent} user(s)`, sent });
  } catch (error) {
    console.error('[AdminBroadcast] sendSystemAnnouncement error:', error);
    res.status(500).json({ success: false, message: 'Failed to send announcement' });
  }
};

// ===========================================================================
// NOTIFICATION CENTER (push notifications, independent of in-app chat)
// ===========================================================================
exports.getNotificationOverview = async (req, res) => {
  try {
    const [totalSubs, enabledSubs] = await Promise.all([
      PushSubscription.countDocuments(),
      PushSubscription.countDocuments({ enabled: true })
    ]);
    res.json({ success: true, overview: { totalSubscriptions: totalSubs, enabledSubscriptions: enabledSubs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load notification overview' });
  }
};

exports.sendPushNotification = async (req, res) => {
  try {
    const { title, body, segment = 'all', url = '/' } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    let userIds = null;
    if (segment !== 'all') {
      const filter = {};
      if (segment === 'premium') filter.premium = true;
      if (segment === 'free') filter.premium = { $ne: true };
      const users = await User.find(filter).select('_id').lean();
      userIds = users.map((u) => u._id.toString());
    }

    const notification = { title, body, icon: '/icons/icon-192.png' };
    const data = { url };

    const result = userIds
      ? await notificationService.sendToUsers(userIds, notification, data)
      : await notificationService.sendBroadcastNotification(notification, data);

    await logAdminAction(req.admin.id, 'admin_sent_push_notification', { title, segment }, null, null, req);
    res.json({ success: true, result });
  } catch (error) {
    console.error('[AdminNotifications] sendPushNotification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send push notification' });
  }
};
