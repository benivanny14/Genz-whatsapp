/**
 * Notification Service
 * Handles push notifications, vibration, and notification settings
 */

// ── Notification Settings ────────────────────────────────────────────────
import { authFetch } from '../utils/authFetch';
import { API_URL } from '../utils/authSession';
import { getDeviceId } from '../utils/deviceIdentity';

const NOTIFICATION_SETTINGS_KEY = 'genz_notification_settings';
const NOTIFICATION_PROMPT_KEY = 'genz_notification_permission_prompted_at';
const NOTIFICATION_PROMPT_RETRY_MS = 24 * 60 * 60 * 1000;
const ENABLE_DEV_SERVICE_WORKER = import.meta.env.VITE_ENABLE_DEV_SERVICE_WORKER === 'true';
const canRegisterServiceWorker = () => import.meta.env.PROD || ENABLE_DEV_SERVICE_WORKER;
let nativePushInitialized = false;
let permissionRequestPromise = null;

const getCapacitor = async () => {
  try {
    const mod = await import('@capacitor/core');
    return mod.Capacitor;
  } catch {
    return null;
  }
};

const isNativeCapacitor = async () => {
  const Capacitor = await getCapacitor();
  if (!Capacitor) return false;
  if (typeof Capacitor.isNativePlatform === 'function') {
    return Capacitor.isNativePlatform();
  }
  return Capacitor.getPlatform?.() !== 'web';
};

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const defaultSettings = {
  enabled: true,
  vibration: true,
  sound: true,
  showPreview: true,
  vibrationPattern: [50, 30, 50], // Short vibration for typing
  messageVibrationPattern: [100, 50, 100, 50, 100], // Longer for messages
  callVibrationPattern: [200, 100, 200, 100, 200], // Longest for calls
};

/**
 * Get notification settings
 */
export const getNotificationSettings = () => {
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('[NotificationService] Failed to load settings:', e);
  }
  return defaultSettings;
};

/**
 * Save notification settings
 */
export const saveNotificationSettings = (settings) => {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[NotificationService] Failed to save settings:', e);
  }
};

/**
 * Update a single setting
 */
export const updateNotificationSetting = (key, value) => {
  const settings = getNotificationSettings();
  settings[key] = value;
  saveNotificationSettings(settings);
  return settings;
};

// ── Vibration ──────────────────────────────────────────────────────────────
/**
 * Trigger vibration (if supported and enabled)
 * @param {number|number[]} pattern - Vibration pattern
 */
export const vibrate = (pattern = [50]) => {
  const settings = getNotificationSettings();
  if (!settings.vibration) return;

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('[NotificationService] Vibration failed:', e);
    }
  }
};

/**
 * Short vibration for typing feedback
 */
export const vibrateTyping = () => {
  const settings = getNotificationSettings();
  if (settings.vibration) {
    vibrate([20]); // Very short vibration for each keystroke
  }
};

/**
 * Medium vibration for message received
 */
export const vibrateMessage = () => {
  const settings = getNotificationSettings();
  if (settings.vibration) {
    vibrate(settings.messageVibrationPattern);
  }
};

/**
 * Long vibration for incoming call
 */
export const vibrateCall = () => {
  const settings = getNotificationSettings();
  if (settings.vibration) {
    // Continuous vibration for calls (repeat pattern)
    const callPattern = settings.callVibrationPattern;
    vibrate(callPattern);
    // Repeat after pattern ends
    setTimeout(() => {
      vibrate(callPattern);
    }, callPattern.reduce((a, b) => a + b, 0));
  }
};

/**
 * Stop all vibrations
 */
export const stopVibration = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
};

// ── Push Notifications ─────────────────────────────────────────────────────
/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  // Check if Notification has the permission property
  if (typeof Notification.permission === 'string') {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
  }

  // Check if requestPermission is a function
  if (typeof Notification.requestPermission !== 'function') {
    console.warn('[NotificationService] requestPermission is not a function');
    return 'unsupported';
  }

  try {
    const lastPromptAt = Number(localStorage.getItem(NOTIFICATION_PROMPT_KEY) || 0);
    if (lastPromptAt && Date.now() - lastPromptAt < NOTIFICATION_PROMPT_RETRY_MS) {
      return Notification.permission;
    }

    if (!permissionRequestPromise) {
      localStorage.setItem(NOTIFICATION_PROMPT_KEY, String(Date.now()));
      permissionRequestPromise = Notification.requestPermission().finally(() => {
        permissionRequestPromise = null;
      });
    }
    return await permissionRequestPromise;
  } catch (e) {
    console.warn('[NotificationService] Permission request failed:', e);
    return 'denied';
  }
};

/**
 * Show a notification (works even when app is closed if service worker is registered)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Notification options
 */
export const showNotification = async (title, body, options = {}) => {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;

  // Check if document is visible (app is open)
  const isAppOpen = document.visibilityState === 'visible';

  // If app is open, we might not need to show notification
  // But we still show it for important messages
  if (isAppOpen && !options.force) return;

  const notifOptions = {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: options.vibratePattern || settings.messageVibrationPattern,
    tag: options.tag || 'genz-message',
    renotify: true,
    requireInteraction: options.requireInteraction || false,
    ...options
  };

  try {
    // Try to use service worker for better notification handling
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) {
      await registration.showNotification(title, notifOptions);
    } else {
      new Notification(title, notifOptions);
    }
  } catch (e) {
    console.warn('[NotificationService] Show notification failed:', e);
    // Fallback
    try {
      new Notification(title, notifOptions);
    } catch (e2) {
      console.warn('[NotificationService] Fallback notification failed:', e2);
    }
  }
};

/**
 * Show message notification
 */
export const showMessageNotification = async (senderName, messagePreview, conversationId) => {
  const settings = getNotificationSettings();

  // Don't show if preview is disabled
  const body = settings.showPreview ? messagePreview : 'New message';

  await showNotification(
    `💬 ${senderName}`,
    body,
    {
      tag: `msg-${conversationId}`,
      data: { conversationId, type: 'message' },
      vibratePattern: settings.messageVibrationPattern,
      requireInteraction: false
    }
  );

  vibrateMessage();
};

/**
 * Show call notification
 */
export const showCallNotification = async (callerName, callType = 'audio') => {
  const icon = callType === 'video' ? '📹' : '📞';

  await showNotification(
    `${icon} Incoming ${callType} call`,
    `${callerName} is calling you`,
    {
      tag: 'incoming-call',
      data: { type: 'call', callerName, callType },
      requireInteraction: true, // Keep notification visible until user acts
      vibratePattern: [200, 100, 200, 100, 200],
      force: true,
      priority: 'high'
    }
  );

  // Continuous vibration for calls
  vibrateCall();
};

/**
 * Show typing notification (only when app is in background)
 */
export const showTypingNotification = (userName) => {
  // Only vibrate, don't show actual notification for typing
  // as it would be too spammy
  const settings = getNotificationSettings();
  if (settings.vibration && document.visibilityState !== 'visible') {
    vibrate([10]); // Very subtle vibration
  }
};

// ── Service Worker Registration ────────────────────────────────────────────
/**
 * Register service worker for background notifications
 */
export const registerServiceWorker = async () => {
  if (await isNativeCapacitor()) {
    console.log('[NotificationService] Skipping Service Worker registration on native platform');
    return null;
  }

  if (!canRegisterServiceWorker()) {
    console.log('[NotificationService] Skipping Service Worker registration in development');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('[NotificationService] Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('[NotificationService] Service Worker registered:', registration.scope);
    return registration;
  } catch (e) {
    console.warn('[NotificationService] Service Worker registration failed:', e);
    return null;
  }
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const subscribeToWebPush = async (registration) => {
  if (await isNativeCapacitor()) {
    return { success: false, reason: 'native-platform' };
  }

  if (!registration?.pushManager) {
    return { success: false, reason: 'push-unsupported' };
  }

  try {
    const keyResponse = await authFetch(`${API_URL}/notifications/vapid-public-key`);
    const keyData = await keyResponse.json().catch(() => ({}));
    const publicKey = keyData.publicKey || keyData.vapidPublicKey;

    if (!keyResponse.ok || !publicKey) {
      console.warn('[NotificationService] VAPID public key unavailable');
      return { success: false, reason: 'missing-vapid-key' };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    const response = await authFetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON ? subscription.toJSON() : subscription,
        deviceId: getDeviceId(),
        userAgent: navigator.userAgent
      })
    });
    const data = await response.json().catch(() => ({}));
    return {
      ...data,
      success: response.ok && data?.success !== false,
      subscription
    };
  } catch (e) {
    console.warn('[NotificationService] Push subscription failed:', e);
    return { success: false, reason: e?.message || 'subscription-failed' };
  }
};

export const registerNativePushNotifications = async () => {
  if (nativePushInitialized) {
    return { success: true, native: true, reason: 'already-initialized' };
  }

  if (!(await isNativeCapacitor())) {
    return { success: false, native: false, reason: 'not-native' };
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    nativePushInitialized = true;

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      nativePushInitialized = false;
      return { success: false, native: true, permission: permission.receive, reason: 'permission-denied' };
    }

    try {
      await PushNotifications.createChannel?.({
        id: 'genz-whatsapp',
        name: 'GENZ WhatsApp',
        description: 'Messages and call notifications',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true
      });
    } catch (channelError) {
      console.warn('[NotificationService] Native notification channel setup failed:', channelError?.message || channelError);
    }

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', async (token) => {
      const value = token?.value;
      if (!value) return;

      try {
        await authFetch(`${API_URL}/notifications/fcm/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: value, deviceId: getDeviceId() })
        });
        console.log('[NotificationService] Native FCM token registered');
      } catch (error) {
        console.warn('[NotificationService] Native FCM token registration failed:', error?.message || error);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[NotificationService] Native push registration error:', error?.error || error?.message || error);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event?.notification?.data || {};
      if (data.conversationId) {
        window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId: data.conversationId } }));
      }
      if (data.type === 'incoming_call' || data.type === 'call') {
        const offer = parseMaybeJson(data.offer);
        window.dispatchEvent(new CustomEvent('native-incoming-call', {
          detail: {
            type: data.callType || 'audio',
            callerId: data.callerId,
            callerName: data.callerName,
            callerPicture: data.callerPicture,
            conversationId: data.conversationId,
            offer,
            status: 'incoming',
            user: { _id: data.callerId, username: data.callerName, profilePicture: data.callerPicture }
          }
        }));
      }
    });

    await PushNotifications.register();
    return { success: true, native: true, permission: permission.receive };
  } catch (error) {
    nativePushInitialized = false;
    console.warn('[NotificationService] Native push initialization failed:', error?.message || error);
    return { success: false, native: true, reason: error?.message || 'native-push-failed' };
  }
};

export const initialize = async () => {
  const nativePush = await registerNativePushNotifications();
  if (nativePush?.success && nativePush.native) {
    return { permission: nativePush.permission || 'granted', registration: null, push: nativePush, nativePush };
  }

  const permission = await requestNotificationPermission();
  const registration = await registerServiceWorker();
  setupBackgroundNotificationHandler();

  let push = null;
  if (permission === 'granted' && registration?.pushManager) {
    push = await subscribeToWebPush(registration);
  }

  return { permission, registration, push };
};

// ── Background Notification Handler ────────────────────────────────────────
/**
 * Set up background notification handling
 * This will be called by the service worker
 */
export const setupBackgroundNotificationHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'notification') {
        const { title, body, options } = event.data;
        showNotification(title, body, { ...options, force: true });
      }
    });
  }
};

export default {
  getNotificationSettings,
  saveNotificationSettings,
  updateNotificationSetting,
  vibrate,
  vibrateTyping,
  vibrateMessage,
  vibrateCall,
  stopVibration,
  requestNotificationPermission,
  showNotification,
  showMessageNotification,
  showCallNotification,
  showTypingNotification,
  registerServiceWorker,
  subscribeToWebPush,
  registerNativePushNotifications,
  initialize,
  setupBackgroundNotificationHandler
};
