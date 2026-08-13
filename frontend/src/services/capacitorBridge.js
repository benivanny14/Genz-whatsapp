/**
 * capacitorBridge.js — single bridge between the GENZ web app and the native
 * Capacitor runtime (used when the app runs inside the Android APK).
 *
 * Everything here is guarded so it degrades gracefully in a normal browser:
 * if Capacitor is not present (or not a native platform), each helper falls
 * back to the standard web behaviour (Service Worker notifications, anchor
 * downloads, navigator.share).
 */
import { Capacitor } from '@capacitor/core';

// Native plugins are imported statically so they are bundled for the APK;
// the code below never calls them unless Capacitor.isNativePlatform() is true.
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = () => !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

// ── Local notifications (native) ───────────────────────────────────────────
/**
 * Show a system notification via the native LocalNotifications plugin.
 * Falls back to the web Notification API when not running natively.
 */
export const showNativeNotification = async (title, body, options = {}) => {
  if (!isNative()) return { used: false };

  try {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return { used: false };

    await LocalNotifications.schedule({
      notifications: [{
        id: options.id || Math.floor(Date.now() / 1000) % 2147483647,
        title,
        body,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#00a884',
        sound: options.sound ?? 'beep.wav',
        schedule: { at: new Date() },
        extra: options.extra || null
      }]
    });
    return { used: true };
  } catch (e) {
    console.warn('[CapacitorBridge] LocalNotification failed:', e?.message || e);
    return { used: false };
  }
};

// ── Push notifications (native FCM token) ──────────────────────────────────
let pushListenersAttached = false;

/**
 * Register the native push token with the backend.
 * POST /api/notifications/fcm/register (already exists — designed for FCM).
 */
const registerNativeToken = async (token) => {
  try {
    // Lazy import keeps this module safe in non-browser (node test) contexts.
    const [{ authFetch }, { API_URL }] = await Promise.all([
      import('../utils/authFetch.js'),
      import('../utils/authSession.js')
    ]);
    const res = await authFetch(`${API_URL}/notifications/fcm/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success !== false;
  } catch (e) {
    console.warn('[CapacitorBridge] FCM token registration failed:', e?.message || e);
    return false;
  }
};

/**
 * Route an incoming native push to the app's existing in-app handlers.
 * The web app already listens for 'genz-in-app-notification' and for
 * service-worker 'message' events with { type: 'notification' }.
 */
const routeIncomingPush = (notification) => {
  const title = notification?.title || 'GENZ';
  const body = notification?.body || notification?.message || '';
  const data = notification?.data || notification?.extra || {};

  // Feed the same in-app toast the web app uses.
  window.dispatchEvent(new CustomEvent('genz-in-app-notification', {
    detail: { title, message: body, avatar: data?.avatar }
  }));

  // Show a native notification (foreground: still useful while app is open).
  showNativeNotification(title, body, {
    extra: data,
    id: typeof data?.conversationId === 'string' ? Math.abs(hashCode(data.conversationId)) % 2147483647 : undefined
  });

  // Let ChatContext know (it listens for service-worker messages).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage?.({ type: 'notification', title, body, options: { force: true, data } });
    }).catch(() => {});
  }
};

const hashCode = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h;
};

/**
 * Initialize native push notifications (Capacitor APK only).
 * Without a google-services.json / Firebase project the plugin reports
 * 'unavailable', and we simply return { success: false, reason } — the app
 * keeps working with local notifications + in-app toasts.
 */
export const initNativePush = async () => {
  if (!isNative()) return { success: false, reason: 'not-native' };

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.warn('[CapacitorBridge] Push permission not granted:', perm);
      return { success: false, reason: 'permission-denied' };
    }

    // Register with FCM and deliver the token to the backend.
    PushNotifications.register();

    const tokenListener = PushNotifications.addListener('registration', async (data) => {
      if (data?.value) await registerNativeToken(data.value);
    });
    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.warn('[CapacitorBridge] Push registration error:', err?.error || err);
    });

    if (!pushListenersAttached) {
      PushNotifications.addListener('pushNotificationReceived', (event) => {
        routeIncomingPush(event?.notification);
      });
      PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        routeIncomingPush(event?.notification);
      });
      pushListenersAttached = true;
    }

    return { success: true, tokenListener, errorListener };
  } catch (e) {
    console.warn('[CapacitorBridge] Native push unavailable (FCM not configured?):', e?.message || e);
    return { success: false, reason: e?.message || 'push-unavailable' };
  }
};

// ── File downloads (native) ────────────────────────────────────────────────
const fileExtensionOf = (filename) => {
  const ext = String(filename || '').split('.').pop()?.toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(ext || '') ? ext : 'bin';
};

/**
 * Download a remote URL and save it to the device.
 * Native: fetch → base64 → Filesystem (Documents) → open the system share
 * sheet so the user can save to Downloads/Drive/etc.
 * Web: standard anchor download.
 */
export const downloadUrl = async (url, filename = 'genz-file.bin') => {
  if (!isNative()) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { used: false };
  }

  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return saveBlob(blob, filename);
  } catch (e) {
    console.warn('[CapacitorBridge] Native download failed, falling back to anchor:', e?.message || e);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    return { used: false };
  }
};

/**
 * Save a base64 data-URL (e.g. canvas.toDataURL output) to the device.
 */
export const saveDataUrl = async (dataUrl, filename = 'genz-image.png') => {
  if (!isNative()) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
    return { used: false };
  }

  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Not a base64 data URL');
    const base64 = match[2];
    const ext = fileExtensionOf(filename);
    const path = `genz-${Date.now()}.${ext}`;
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      encoding: Encoding.BASE64
    });
    const uri = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri.uri });
    return { used: true };
  } catch (e) {
    console.warn('[CapacitorBridge] Native data-URL save failed, falling back:', e?.message || e);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
    return { used: false };
  }
};

/**
 * Save a Blob (e.g. chat export) to the device.
 */
export const saveBlob = async (blob, filename = 'genz-export.txt') => {
  if (!isNative()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { used: false };
  }

  try {
    const base64 = await blobToBase64(blob);
    const ext = fileExtensionOf(filename);
    const path = `genz-${Date.now()}.${ext}`;
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      encoding: Encoding.BASE64
    });
    const uri = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri.uri });
    return { used: true };
  } catch (e) {
    console.warn('[CapacitorBridge] Native blob save failed, falling back:', e?.message || e);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { used: false };
  }
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export default {
  isNative,
  showNativeNotification,
  initNativePush,
  downloadUrl,
  saveDataUrl,
  saveBlob
};
