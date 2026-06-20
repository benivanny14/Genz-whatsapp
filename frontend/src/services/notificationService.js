/**
 * Notification Service
 * Handles push notifications, vibration, and notification settings
 */

// ── Notification Settings ────────────────────────────────────────────────
const NOTIFICATION_SETTINGS_KEY = 'genz_notification_settings';

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
    const result = await Notification.requestPermission();
    return result;
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
      vibratePattern: [200, 100, 200, 100, 200]
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
  setupBackgroundNotificationHandler
};