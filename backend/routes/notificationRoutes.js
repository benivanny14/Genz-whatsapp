const express = require('express');
const router = express.Router();
const {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  listSubscriptions,
  sendTestNotification
} = require('../controllers/notificationController');
const {
  registerToken,
  unregisterToken,
  subscribeToTopic,
  unsubscribeFromTopic
} = require('../controllers/fcmController');
const { protect } = require('../middleware/auth');

// VAPID (Web Push) endpoints
router.get('/vapid-public-key', getVapidPublicKey);

// FCM (Firebase Cloud Messaging) endpoints
router.use(protect);
router.post('/fcm/register', registerToken);
router.post('/fcm/unregister', unregisterToken);
router.post('/fcm/subscribe-topic', subscribeToTopic);
router.post('/fcm/unsubscribe-topic', unsubscribeFromTopic);

// VAPID endpoints (legacy Web Push)
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/subscriptions', listSubscriptions);
router.post('/test', sendTestNotification);

module.exports = router;
