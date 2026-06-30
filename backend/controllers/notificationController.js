const PushSubscription = require('../models/PushSubscription');
const notificationService = require('../services/notificationService');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

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

exports.sendTestNotification = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const result = await notificationService.sendToUser(
      userId,
      {
        title: 'GENZ WhatsApp',
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
