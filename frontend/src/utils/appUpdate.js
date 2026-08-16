// Update-checking utilities used by the Settings "Check for Updates" row and
// the web reload path.
//
// 1. getAppUpdateInfo() — the WhatsApp-style check: compare the version this
//    device is RUNNING (installed native versionCode via @capacitor/app, or
//    the bundle's baked-in __GENZ_VERSION_CODE__ on the web) against the
//    latest one published in /version.json (written by npm run apk:build).
//    Returns the full picture — installed vs latest, whether an update
//    exists, the "What's new" changelog, and the APK download URL — so the
//    UI can render a proper update dialog instead of a bare toast.
//
// 2. checkForUpdate() — the PWA/service-worker check (web only): lets the
//    user trigger the browser's own background update check RIGHT NOW,
//    instead of waiting for it. When a new service worker takes over,
//    main.jsx already dispatches 'pwa-update-available' (shown by App.jsx as
//    a reload toast) — this utility just triggers that check on demand.
//
// checkForUpdate returns one of: 'updated' | 'up-to-date' | 'unsupported' | 'error'

import { fetchVersionManifest, apkDownloadUrl } from './versionManifest';
import { getAppInfo, isNative } from '../services/capacitorBridge';

/**
 * Compare the running build against the published one.
 *
 * @returns {Promise<{
 *   manifest: object,
 *   installed: { version: string, code: number },
 *   hasUpdate: boolean,
 *   changes: string[],
 *   apkUrl: string,
 *   isWeb: boolean
 * } | null>} null when no manifest could be fetched (offline / unreachable).
 */
export const getAppUpdateInfo = async () => {
  const manifest = await fetchVersionManifest();
  if (!manifest) return null;

  const latestCode = Number(manifest.versionCode || 0);
  let installedCode = 0;
  let installedVersion = '0.0.0';
  const web = !isNative();

  if (!web) {
    const info = await getAppInfo().catch(() => null);
    if (!info) return null;
    installedCode = info.versionCode ?? info.build ?? 0;
    installedVersion = info.version || '';
  } else {
    installedCode = Number(typeof __GENZ_VERSION_CODE__ !== 'undefined' ? __GENZ_VERSION_CODE__ : 0);
    installedVersion = typeof __GENZ_VERSION__ !== 'undefined' ? __GENZ_VERSION__ : '0.0.0';
  }

  return {
    manifest,
    installed: { version: installedVersion, code: installedCode },
    hasUpdate: latestCode > installedCode,
    changes: Array.isArray(manifest.changes) ? manifest.changes : [],
    apkUrl: manifest.apkUrl || apkDownloadUrl(),
    isWeb: web
  };
};

export const checkForUpdate = async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';

  try {
    const registration = await navigator.serviceWorker.ready;
    const previousWaiting = !!registration.waiting;

    // This SW calls skipWaiting() on install, so a newly installed worker
    // takes control almost immediately and registration.waiting usually
    // never gets populated. Detect the take-over via the controllerchange
    // event instead of polling registration.waiting.
    const tookOver = await new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve(value);
      };
      const onControllerChange = () => finish(true);
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      setTimeout(() => finish(false), 5000);
    });

    await registration.update();

    if (tookOver) {
      // A new version activated and controls the page. main.jsx's
      // controllerchange listener already fired the reload toast.
      return 'updated';
    }

    // Give the browser a moment to finish installing if it found something.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (registration.waiting) {
      // A new version is installed and waiting — tell it to take over.
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return 'updated';
    }

    return previousWaiting ? 'updated' : 'up-to-date';
  } catch (err) {
    console.error('[appUpdate] Update check failed:', err);
    return 'error';
  }
};
