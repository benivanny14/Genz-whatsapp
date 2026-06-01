/**
 * GENZ Notification Service
 * Registers Service Worker, requests permission, and sends push notifications
 */

const SW_URL = '/service-worker.js';

// ── Register Service Worker ───────────────────────────────────────────────
export const registerServiceWorker = async () => {
  // Only register in production mode
  if (!import.meta.env.PROD) {
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
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
};

// ── Show local notification ───────────────────────────────────────────────
export const showLocalNotification = async (title, body, options = {}) => {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return;

  const reg = await navigator.serviceWorker?.ready;

  const notifOptions = {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    tag: options.conversationId || 'genz-msg',
    renotify: true,
    data: { conversationId: options.conversationId, url: '/' },
    ...options
  };

  if (reg) {
    // Use Service Worker for richer notifications
    await reg.showNotification(title, notifOptions);
  } else {
    // Fallback to basic Notification API
    new Notification(title, notifOptions);
  }
};

// ── Auto-show notification for incoming messages ─────────────────────────
export const notifyNewMessage = (senderName, messagePreview, conversationId) => {
  // Only notify if tab is not focused
  if (document.visibilityState === 'visible') return;
  showLocalNotification(
    `💬 ${senderName}`,
    messagePreview.substring(0, 100),
    { conversationId }
  );
};

// ── Auto-show notification for incoming calls ─────────────────────────────
export const notifyIncomingCall = (callerName, callType = 'audio') => {
  showLocalNotification(
    `📞 Incoming ${callType} call`,
    `${callerName} is calling you on GENZ WhatsApp`,
    { tag: 'genz-call' }
  );
};
