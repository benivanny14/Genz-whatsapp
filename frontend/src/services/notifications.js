/**
 * GENZ Notification Service
 * Registers Service Worker, requests permission, and sends push notifications
 */

const SW_URL = '/service-worker.js';
const ENABLE_DEV_SERVICE_WORKER = import.meta.env.VITE_ENABLE_DEV_SERVICE_WORKER === 'true';

// ── Register Service Worker ───────────────────────────────────────────────
export const registerServiceWorker = async () => {
  const canRegister = import.meta.env.PROD || ENABLE_DEV_SERVICE_WORKER;

  if (!canRegister) {
    console.log('[Notifications] Skipping SW registration in development');
    return null;
  }
  
  if (!('serviceWorker' in navigator)) {
    console.warn('[Notifications] Service Workers not supported');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    console.log('[Notifications] Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[Notifications] SW registration failed:', err);
    return null;
  }
};

// ── Request notification permission ──────────────────────────────────────
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  
  // Check if Notification has the permission property
  if (typeof Notification.permission === 'string') {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
  }
  
  // Check if requestPermission is a function
  if (typeof Notification.requestPermission !== 'function') {
    console.warn('[Notifications] requestPermission is not a function');
    return 'unsupported';
  }
  
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn('[Notifications] Permission request failed:', e);
    return 'denied';
  }
};

// ── Show local notification ───────────────────────────────────────────────
export const showLocalNotification = async (title, body, options = {}) => {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return;

  const reg = await navigator.serviceWorker?.ready;

  const notifOptions = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: options.conversationId || 'genz-msg',
    renotify: true,
    data: {
      conversationId: options.conversationId,
      url: options.conversationId ? `/chat?conversationId=${options.conversationId}` : '/'
    },
    ...options
  };

  if (reg && typeof reg.showNotification === 'function') {
    try {
      // Use Service Worker for richer notifications
      await reg.showNotification(title, notifOptions);
    } catch (err) {
      console.warn('[Notifications] SW showNotification failed, falling back:', err);
      new Notification(title, notifOptions);
    }
  } else {
    // Fallback to basic Notification API
    new Notification(title, notifOptions);
  }
};

// ── Auto-show notification for incoming messages ─────────────────────────
export const notifyNewMessage = (senderName, messagePreview, conversationId) => {
  // Only notify if tab is not focused
  if (document.visibilityState === 'visible') return;
  const preview = typeof messagePreview === 'string' ? messagePreview : 'New message';
  showLocalNotification(
    `💬 ${senderName}`,
    preview.substring(0, 100),
    { conversationId }
  );
};

// ── Auto-show notification for incoming calls ─────────────────────────────
export const notifyIncomingCall = (callerName, callType = 'audio') => {
  showLocalNotification(
    `${callerName}`,
    `${callType === 'video' ? 'Video call' : 'Voice call'}`,
    { tag: 'genz-call', type: 'call', callerName, callType, requireInteraction: true }
  );
};
