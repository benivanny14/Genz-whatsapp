const admin = require('firebase-admin');

/**
 * Firebase Configuration
 * Handles Firebase Cloud Messaging (FCM) for push notifications
 */

/**
 * Initialize Firebase Admin SDK
 */
let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK with service account credentials
 * @returns {admin.app.App} Firebase app instance
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const parseServiceAccount = () => {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (error) {
        console.error('[Firebase] FIREBASE_SERVICE_ACCOUNT is not valid JSON');
        return null;
      }
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    return {
      type: 'service_account',
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
    };
  };

  const serviceAccountConfig = parseServiceAccount();
  if (!serviceAccountConfig) {
    console.warn('[Firebase] Firebase credentials not configured. Push notifications will be disabled.');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountConfig)
    }, 'genz-whatsapp');

    console.log('[Firebase] Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
    return null;
  }
};

/**
 * Get Firebase messaging instance
 * @returns {admin.messaging.Messaging} Messaging instance or null
 */
const getMessaging = () => {
  const app = initializeFirebase();
  if (!app) {
    return null;
  }
  return admin.messaging(app);
};

/**
 * Validate FCM token format
 * @param {string} token - FCM token to validate
 * @returns {boolean} True if valid
 */
const validateToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  return token.length >= 50 && token.length <= 4096;
};

const stringifyData = (data = {}) => {
  const out = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    out[key] = typeof value === 'string' ? value : String(value);
  });
  return out;
};

const channelForType = (type = 'message') => {
  if (type === 'group_message' || type === 'group') return 'genz_groups';
  if (type === 'status') return 'genz_status';
  if (type === 'silent') return 'genz_silent';
  return 'genz_messages';
};

const buildAndroid = (notification = {}, data = {}) => ({
  priority: notification.priority === 'normal' ? 'normal' : 'high',
  notification: {
    channelId: notification.channelId || channelForType(notification.type || data.type),
    icon: 'ic_stat_genz',
    color: '#128C7E',
    sound: notification.sound || 'default',
    tag: notification.tag || 'genz',
    clickAction: notification.clickAction || data.deepLink || '/'
  }
});

/**
 * Send push notification to a single device
 * @param {string} token - FCM token
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload
 * @returns {Promise<Object>} Send result
 */
const sendNotification = async (token, notification, data = {}) => {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[Firebase] Messaging not initialized, skipping notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!validateToken(token)) {
    console.warn('[Firebase] Invalid FCM token:', token);
    return { success: false, error: 'Invalid token' };
  }

  try {
    const dataPayload = stringifyData({
      ...data,
      type: notification.type || data.type || 'message',
      timestamp: Date.now().toString(),
      deepLink: data.deepLink || notification.clickAction || '/'
    });
    const message = {
      token: token,
      notification: {
        title: notification.title || 'GENZ WhatsApp',
        body: notification.body || ''
      },
      data: dataPayload,
      android: buildAndroid(notification, dataPayload),
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title || 'GENZ WhatsApp',
              body: notification.body || ''
            },
            sound: notification.sound || 'default',
            badge: notification.badge || 1
          }
        }
      }
    };

    const response = await messaging.send(message);
    console.log('[Firebase] Notification sent successfully:', response);
    
    return {
      success: true,
      messageId: response
    };
  } catch (error) {
    console.error('[Firebase] Failed to send notification:', error?.code || error.message);
    
    // Check if token is invalid/expired
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'UNREGISTERED') {
      return {
        success: false,
        error: 'Token not registered',
        tokenInvalid: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send push notification to multiple devices
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload
 * @returns {Promise<Object>} Send result
 */
const sendMulticastNotification = async (tokens, notification, data = {}) => {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[Firebase] Messaging not initialized, skipping multicast notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided' };
  }

  try {
    const validTokens = (tokens || []).filter(validateToken);
    if (!validTokens.length) {
      return { success: false, error: 'No valid tokens provided', invalidTokens: tokens || [] };
    }
    const dataPayload = stringifyData({
      ...data,
      type: notification.type || data.type || 'message',
      timestamp: Date.now().toString(),
      deepLink: data.deepLink || notification.clickAction || '/'
    });
    const message = {
      tokens: validTokens,
      notification: {
        title: notification.title || 'GENZ WhatsApp',
        body: notification.body || ''
      },
      data: dataPayload,
      android: buildAndroid(notification, dataPayload),
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title || 'GENZ WhatsApp',
              body: notification.body || ''
            },
            sound: notification.sound || 'default',
            badge: notification.badge || 1
          }
        }
      }
    };

    const sendMany = typeof messaging.sendEachForMulticast === 'function'
      ? messaging.sendEachForMulticast.bind(messaging)
      : messaging.sendMulticast.bind(messaging);
    const response = await sendMany(message);
    
    console.log('[Firebase] Multicast notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    
    const invalidTokens = [];
    (response.responses || []).forEach((resp, index) => {
      if (!resp.success) {
        const code = resp.error?.code || '';
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'UNREGISTERED') {
          invalidTokens.push(validTokens[index]);
        }
      }
    });
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens
    };
  } catch (error) {
    console.error('[Firebase] Failed to send multicast notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send notification to a topic
 * @param {string} topic - Topic name
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload
 * @returns {Promise<Object>} Send result
 */
const sendTopicNotification = async (topic, notification, data = {}) => {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[Firebase] Messaging not initialized, skipping topic notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title || 'GENZ WhatsApp',
        body: notification.body || '',
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/badge-72x72.png',
        sound: notification.sound || 'default',
        click_action: notification.clickAction || '/',
        tag: notification.tag || 'default'
      },
      data: {
        ...data,
        type: notification.type || 'message',
        timestamp: Date.now().toString()
      },
      android: {
        notification: {
          channelId: 'genz-whatsapp',
          priority: notification.priority || 'high',
          sound: notification.sound || 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title || 'GENZ WhatsApp',
              body: notification.body || ''
            },
            sound: notification.sound || 'default',
            badge: notification.badge || 1
          }
        }
      }
    };

    const response = await messaging.send(message);
    console.log('[Firebase] Topic notification sent successfully:', response);
    
    return {
      success: true,
      messageId: response
    };
  } catch (error) {
    console.error('[Firebase] Failed to send topic notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Subscribe a device to a topic
 * @param {string} token - FCM token
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} Subscribe result
 */
const subscribeToTopic = async (token, topic) => {
  const messaging = getMessaging();
  if (!messaging) {
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const response = await messaging.subscribeToTopic(token, topic);
    console.log('[Firebase] Subscribed to topic:', topic, response);
    
    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('[Firebase] Failed to subscribe to topic:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Unsubscribe a device from a topic
 * @param {string} token - FCM token
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} Unsubscribe result
 */
const unsubscribeFromTopic = async (token, topic) => {
  const messaging = getMessaging();
  if (!messaging) {
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const response = await messaging.unsubscribeFromTopic(token, topic);
    console.log('[Firebase] Unsubscribed from topic:', topic, response);
    
    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('[Firebase] Failed to unsubscribe from topic:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if Firebase is configured
 * @returns {boolean} True if configured
 */
const isConfigured = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return true;
  return !!process.env.FIREBASE_PROJECT_ID &&
         !!process.env.FIREBASE_CLIENT_EMAIL &&
         !!process.env.FIREBASE_PRIVATE_KEY;
};

module.exports = {
  initializeFirebase,
  getMessaging,
  validateToken,
  sendNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  isConfigured
};
