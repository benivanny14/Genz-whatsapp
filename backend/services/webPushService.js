const PushSubscription = require('../models/PushSubscription');

let webPush = null;
try {
  webPush = require('web-push');
} catch (error) {
  webPush = null;
}

const isConfigured = () => Boolean(
  webPush &&
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
);

const configure = () => {
  if (!isConfigured()) return false;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
};

const buildPayload = (notification = {}, data = {}) => JSON.stringify({
  title: notification.title || 'GENZ WhatsApp',
  body: notification.body || '',
  icon: notification.icon || '/icons/icon-192x192.png',
  badge: notification.badge || '/icons/icon-192x192.png',
  tag: notification.tag || 'genz-notification',
  data: {
    type: notification.type || data.type || 'notification',
    clickAction: notification.clickAction || data.clickAction || '/',
    ...data
  }
});

const pruneIfGone = async (subscription, error) => {
  if (error?.statusCode === 404 || error?.statusCode === 410) {
    await PushSubscription.findByIdAndUpdate(subscription._id, {
      enabled: false,
      lastSeenAt: new Date()
    });
    return true;
  }
  return false;
};

const sendWithRetry = async (subscription, payload, attempt = 1) => {
  try {
    await webPush.sendNotification({
      endpoint: subscription.endpoint,
      keys: subscription.keys
    }, payload);
    return { success: true, endpoint: subscription.endpoint };
  } catch (error) {
    const pruned = await pruneIfGone(subscription, error);
    const retryable = !pruned && attempt < Number(process.env.PUSH_MAX_RETRIES || 3);

    if (retryable) {
      const delay = Math.min(1000 * (2 ** (attempt - 1)), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWithRetry(subscription, payload, attempt + 1);
    }

    return {
      success: false,
      endpoint: subscription.endpoint,
      pruned,
      error: error.message
    };
  }
};

const sendToSubscriptions = async (subscriptions, notification, data = {}) => {
  if (!configure()) {
    return {
      success: false,
      provider: 'web-push',
      error: webPush ? 'VAPID not configured' : 'web-push package not installed'
    };
  }

  const payload = buildPayload(notification, data);
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendWithRetry(subscription, payload))
  );

  const sent = results.filter((result) => result.status === 'fulfilled' && result.value?.success !== false).length;
  const failed = results.length - sent;

  return {
    success: sent > 0,
    provider: 'web-push',
    sent,
    failed
  };
};

const sendToUser = async (userId, notification, data = {}) => {
  const subscriptions = await PushSubscription.find({ userId: userId.toString(), enabled: true });
  if (!subscriptions.length) {
    return { success: false, provider: 'web-push', error: 'No Web Push subscriptions' };
  }

  return sendToSubscriptions(subscriptions, notification, data);
};

const sendToUsers = async (userIds, notification, data = {}) => {
  const subscriptions = await PushSubscription.find({
    userId: { $in: userIds.map((id) => id.toString()) },
    enabled: true
  });
  if (!subscriptions.length) {
    return { success: false, provider: 'web-push', error: 'No Web Push subscriptions' };
  }

  return sendToSubscriptions(subscriptions, notification, data);
};

const sendBroadcast = async (notification, data = {}) => {
  const subscriptions = await PushSubscription.find({ enabled: true });
  if (!subscriptions.length) {
    return { success: false, provider: 'web-push', error: 'No Web Push subscriptions' };
  }

  return sendToSubscriptions(subscriptions, notification, data);
};

module.exports = {
  isConfigured,
  sendToUser,
  sendToUsers,
  sendBroadcast
};
