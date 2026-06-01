import { getDeviceId } from '../utils/deviceIdentity';
import { authFetch } from '../utils/authFetch';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_BASE_URL = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const apiHeaders = () => ({
  'Content-Type': 'application/json',
  'x-device-id': getDeviceId()
});

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.subscribed = false;
    this.registration = null;
    this.inAppNotificationCallback = null;
    this.fcmToken = null;
    this.firebaseInitialized = false;
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  // Check if permission is granted
  hasPermission() {
    return Notification.permission === 'granted';
  }

  // Show in-app notification
  showInAppNotification({ title, body, chatId, messageId, sender, type = 'message' }) {
    if (this.inAppNotificationCallback) {
      this.inAppNotificationCallback({
        title,
        body,
        chatId,
        messageId,
        sender,
        type,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Show system notification
  async showSystemNotification({ title, body, chatId, messageId, sender, type = 'message' }) {
    if (!this.hasPermission()) {
      return false;
    }

    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: messageId || chatId, // Prevent duplicates
      requireInteraction: false,
      silent: false,
      data: {
        chatId,
        messageId,
        sender,
        type
      }
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      notification.close();
      
      // Navigate to the chat
      if (chatId && window.location.pathname !== `/chat/${chatId}`) {
        window.location.href = `/chat/${chatId}`;
      }
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return true;
  }

  // Show notification (in-app or system based on app state)
  async showNotification({ title, body, chatId, messageId, sender, type = 'message' }) {
    const isAppOpen = document.visibilityState === 'visible';
    
    // Show in-app notification if app is open
    if (isAppOpen) {
      this.showInAppNotification({ title, body, chatId, messageId, sender, type });
    } else {
      // Show system notification if app is closed/minimized
      await this.showSystemNotification({ title, body, chatId, messageId, sender, type });
    }
  }

  // Set callback for in-app notifications
  onInAppNotification(callback) {
    this.inAppNotificationCallback = callback;
  }

  // Initialize Firebase Cloud Messaging
  async initializeFirebase() {
    if (this.firebaseInitialized) {
      return true;
    }

    // Check if Firebase is configured
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('[NotificationService] Firebase not configured, skipping FCM');
      return false;
    }

    try {
      // Dynamically import Firebase SDK
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Get FCM token
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, { vapidKey });

      if (token) {
        this.fcmToken = token;
        await this.registerFCMToken(token);
        console.log('[NotificationService] FCM token registered:', token);
      }

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        console.log('[NotificationService] Foreground message received:', payload);
        this.showNotification({
          title: payload.notification?.title || 'New Message',
          body: payload.notification?.body || '',
          chatId: payload.data?.conversationId,
          messageId: payload.data?.messageId,
          sender: payload.data?.senderId,
          type: payload.data?.type || 'message'
        });
      });

      this.firebaseInitialized = true;
      return true;
    } catch (error) {
      console.error('[NotificationService] Firebase initialization failed:', error);
      return false;
    }
  }

  // Register FCM token with backend
  async registerFCMToken(token) {
    try {
      const response = await authFetch(`${API_BASE_URL}/notifications/fcm/register`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[NotificationService] Failed to register FCM token:', error);
      return false;
    }
  }

  // Unregister FCM token from backend
  async unregisterFCMToken(token) {
    try {
      const response = await authFetch(`${API_BASE_URL}/notifications/fcm/unregister`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[NotificationService] Failed to unregister FCM token:', error);
      return false;
    }
  }

  // Subscribe to FCM topic
  async subscribeToTopic(topic) {
    try {
      const response = await authFetch(`${API_BASE_URL}/notifications/fcm/subscribe-topic`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ topic })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[NotificationService] Failed to subscribe to topic:', error);
      return false;
    }
  }

  // Unsubscribe from FCM topic
  async unsubscribeFromTopic(topic) {
    try {
      const response = await authFetch(`${API_BASE_URL}/notifications/fcm/unsubscribe-topic`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ topic })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[NotificationService] Failed to unsubscribe from topic:', error);
      return false;
    }
  }

  // Subscribe to push notifications (requires service worker)
  async subscribeToPush() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      if (!import.meta.env.PROD) {
        console.log('Push subscription skipped in development');
        return null;
      }

      this.registration = await navigator.serviceWorker.ready;
      let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        const keyResponse = await authFetch(`${API_BASE_URL}/notifications/vapid-public-key`, {
          headers: apiHeaders()
        });
        const keyData = await keyResponse.json();
        vapidPublicKey = keyData.publicKey;
      }

      if (!vapidPublicKey) {
        console.warn('VAPID public key is not configured; push storage skipped');
        return this.registration;
      }

      const existingSubscription = await this.registration.pushManager.getSubscription();
      const pushSubscription = existingSubscription || await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await authFetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          deviceId: getDeviceId()
        })
      });

      this.subscribed = true;
      return pushSubscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  // Handle incoming push message
  async handlePushMessage(payload) {
    const { title, body, chatId, messageId, sender, type } = payload.data || payload;
    
    await this.showNotification({
      title: title || 'GENZ WhatsApp',
      body: body || 'New message',
      chatId,
      messageId,
      sender,
      type
    });
  }

  // Clear all notifications
  clearNotifications() {
    if ('Notification' in window && 'getNotifications' in Notification) {
      // Close all system notifications (only supported in some browsers)
      try {
        Notification.getNotifications().forEach(notification => {
          notification.close();
        });
      } catch (error) {
        console.warn('Failed to clear notifications:', error);
      }
    }
  }

  // Initialize all notification services (FCM + Web Push)
  async initialize() {
    const hasPermission = await this.requestPermission();
    
    if (hasPermission) {
      // Try Firebase FCM first
      await this.initializeFirebase();
      
      // Fallback to Web Push if FCM not available
      if (!this.firebaseInitialized) {
        await this.subscribeToPush();
      }
    }

    return hasPermission;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
