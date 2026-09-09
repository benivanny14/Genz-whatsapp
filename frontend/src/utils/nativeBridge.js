/**
 * nativeBridge.js — Unified cross-platform bridge for 18 web APIs that break in Capacitor APK.
 * Works on BOTH web and APK: checks Capacitor.isNativePlatform(), uses plugin if native, browser API if web.
 * @see capacitor.config.json, AndroidManifest.xml, index.html, backend/server.js CORS
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

// 1. Blob URLs → Filesystem + convertFileSrc
export const getDisplayUrl = async (blobOrFile) => {
  if (!isNative()) return URL.createObjectURL(blobOrFile);
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(blobOrFile);
    });
    const path = `genz-blob-${Date.now()}.${blobOrFile.type?.split('/')[1] || 'bin'}`;
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, encoding: Encoding.BASE64 });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    return Capacitor.convertFileSrc(uri);
  } catch { return URL.createObjectURL(blobOrFile); }
};
export const revokeDisplayUrl = (url) => {
  try { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); } catch {}
};

// 2. Service Worker → PushNotifications + LocalNotifications
export const registerPush = async () => {
  if (!isNative()) {
    // Web: use Service Worker push (existing notificationService.js)
    return { used: false, reason: 'web-sw' };
  }
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return { used: true, granted: false };
    await PushNotifications.register();
    return { used: true, granted: true };
  } catch (e) { return { used: true, error: e.message }; }
};

// 3. Web Share API → @capacitor/share
export const shareContent = async (opts) => {
  if (!isNative()) {
    if (navigator.share) { await navigator.share(opts); return { used: false, shared: true }; }
    throw new Error('Web Share not supported');
  }
  const { Share } = await import('@capacitor/share');
  await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
  return { used: true, shared: true };
};

// 4. Clipboard API → @capacitor/clipboard
export const writeClipboard = async (text) => {
  if (!isNative()) {
    await navigator.clipboard.writeText(text);
    return { used: false };
  }
  const { Clipboard } = await import('@capacitor/clipboard');
  await Clipboard.write({ string: String(text) });
  return { used: true };
};
export const readClipboard = async () => {
  if (!isNative()) return await navigator.clipboard.readText();
  const { Clipboard } = await import('@capacitor/clipboard');
  const { value } = await Clipboard.read();
  return value || '';
};

// 5. Browser Notifications → @capacitor/local-notifications
export const showNotification = async (title, body, data = {}) => {
  if (!isNative()) {
    if (Notification.permission === 'granted') new Notification(title, { body, icon: '/icons/icon-192x192.png', data });
    return { used: false };
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.schedule({ notifications: [{ title, body, id: Date.now() % 2147483647, smallIcon: 'ic_stat_icon', extra: data }] });
  return { used: true };
};

// 6. File Download → @capacitor/filesystem
export const downloadFile = async (url, filename) => {
  if (!isNative()) {
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    return { used: false };
  }
  try {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const base64 = await new Promise((res2, rej) => {
      const r = new FileReader(); r.onload = () => res2(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob);
    });
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents, encoding: Encoding.BASE64 });
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Documents });
    await Share.share({ title: filename, url: uri });
    return { used: true };
  } catch {
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    return { used: false };
  }
};

// 7. Camera Input → @capacitor/camera
export const pickImage = async (opts = {}) => {
  if (!isNative()) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => resolve(input.files?.[0] || null);
      input.click();
    });
  }
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.Uri, source: CameraSource.Prompt, correctOrientation: true, ...opts });
  const res = await fetch(photo.webPath); const blob = await res.blob();
  return new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
};

// 8. Vibration API → @capacitor/haptics
export const vibrate = async (pattern = [100]) => {
  if (!isNative()) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
    return { used: false };
  }
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light });
  return { used: true };
};

// 9. Fullscreen API → @capacitor/screen-orientation + StatusBar
export const toggleFullscreen = async (enable) => {
  if (!isNative()) {
    if (enable && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else if (!enable && document.exitFullscreen) await document.exitFullscreen();
    return { used: false };
  }
  const { StatusBar } = await import('@capacitor/status-bar');
  if (enable) await StatusBar.hide(); else await StatusBar.show();
  return { used: true };
};

// 10. Geolocation API → @capacitor/geolocation
export const getCurrentPosition = async (opts) => {
  if (!isNative()) return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opts));
  const { Geolocation } = await import('@capacitor/geolocation');
  const perm = await Geolocation.requestPermissions();
  if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') throw new Error('Location permission denied');
  return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, ...opts });
};
export const watchPosition = async (cb, opts) => {
  if (!isNative()) return navigator.geolocation.watchPosition(cb, console.warn, opts);
  const { Geolocation } = await import('@capacitor/geolocation');
  const id = await Geolocation.watchPosition({ enableHighAccuracy: true, ...opts }, cb);
  return id;
};

// 11. localStorage → @capacitor/preferences
export const storageGet = async (key) => {
  if (!isNative()) return localStorage.getItem(key);
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key });
  return value;
};
export const storageSet = async (key, value) => {
  if (!isNative()) { localStorage.setItem(key, value); return; }
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value: String(value) });
};
export const storageRemove = async (key) => {
  if (!isNative()) { localStorage.removeItem(key); return; }
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key });
};

// 12. WebSocket → reconnection + App state listener
export const setupSocketResilience = (socket) => {
  if (!socket) return;
  socket.io.opts.reconnection = true;
  socket.io.opts.reconnectionAttempts = 10;
  socket.io.opts.reconnectionDelay = 1000;
  socket.io.opts.reconnectionDelayMax = 5000;
  socket.io.opts.timeout = 20000;
  if (isNative()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && !socket.connected) socket.connect();
      });
    }).catch(() => {});
  }
  socket.on('disconnect', () => { /* will auto-reconnect */ });
  socket.on('reconnect', () => { socket.emit('user:join', { userId: localStorage.getItem('userId') }); });
};

// 13. Fetch CORS — handled in backend/server.js: capacitor://localhost + https://localhost allowed
export const fetchWithCors = (url, opts = {}) => fetch(url, { ...opts, credentials: 'include' });

// 14. Audio/Video autoplay restrictions
export const playMedia = async (el) => {
  if (!el) return;
  try {
    el.muted = false;
    await el.play();
  } catch {
    el.muted = true;
    try { await el.play(); } catch {}
  }
};

// 15. backdrop-filter → CSS fallbacks (JS helper)
export const supportsBackdropFilter = () => {
  if (!isNative()) return CSS.supports('backdrop-filter', 'blur(10px)') || CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
  return true; // WebView modern supports
};
export const backdropFallbackClass = () => supportsBackdropFilter() ? 'glass' : 'glass-fallback';

// 16. safe-area-inset → viewport-fit=cover (handled in index.html meta)
export const applySafeArea = () => {
  // CSS: env(safe-area-inset-*) works if index.html has viewport-fit=cover
  document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top)');
};

// 17. Keyboard Events → @capacitor/keyboard
export const setupKeyboard = () => {
  if (!isNative()) return;
  import('@capacitor/keyboard').then(({ Keyboard }) => {
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
    });
  }).catch(() => {});
};

// 18. Deep Links → @capacitor/app appUrlOpen
export const setupDeepLinks = (navigate) => {
  if (!isNative()) return;
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', (data) => {
      const url = data.url || '';
      const statusMatch = url.match(/\/status\/([A-Za-z0-9]+)/);
      if (statusMatch?.[1]) { navigate(`/status/${statusMatch[1]}`); return; }
      const chatMatch = url.match(/\/chat\/([A-Za-z0-9]+)/);
      if (chatMatch?.[1]) { navigate(`/chat/${chatMatch[1]}`); return; }
      const joinMatch = url.match(/\/join\/([^\/]+)\/([^\/]+)/);
      if (joinMatch) navigate(`/join/${joinMatch[1]}/${joinMatch[2]}`);
    });
    App.getLaunchUrl().then((res) => {
      const url = res?.url || '';
      if (url) {
        const m = url.match(/\/status\/([A-Za-z0-9]+)/);
        if (m?.[1]) navigate(`/status/${m[1]}`);
      }
    }).catch(() => {});
  }).catch(() => {});
};

export default {
  isNative, getDisplayUrl, revokeDisplayUrl, registerPush, shareContent,
  writeClipboard, readClipboard, showNotification, downloadFile, pickImage,
  vibrate, toggleFullscreen, getCurrentPosition, watchPosition,
  storageGet, storageSet, storageRemove, setupSocketResilience,
  fetchWithCors, playMedia, supportsBackdropFilter, backdropFallbackClass,
  applySafeArea, setupKeyboard, setupDeepLinks
};
