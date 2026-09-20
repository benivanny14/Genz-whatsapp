import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { isNative } from './platform';

const APP_VERSION = {
  versionName: import.meta.env.VITE_APP_VERSION || '1.0.0',
  versionCode: Number(import.meta.env.VITE_APP_VERSION_CODE || 1)
};

const DISMISS_KEY = 'genz_update_prompt_code';
let started = false;

const publicOrigin = () => {
  const api = import.meta.env.VITE_API_URL || '';
  if (api) {
    try {
      return new URL(api, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
};

export async function openApkUrl(apkUrl) {
  const absolute = apkUrl.startsWith('http') ? apkUrl : `${publicOrigin()}${apkUrl}`;
  try {
    if (Capacitor.isPluginAvailable('Browser')) {
      await Browser.open({ url: absolute });
      return;
    }
  } catch (error) {
    console.warn('[update] Browser plugin failed', error);
  }
  window.open(absolute, '_blank', 'noopener,noreferrer');
}

async function localVersionCode() {
  if (isNative()) {
    try {
      const info = await App.getInfo();
      const code = Number(info.build);
      if (Number.isFinite(code) && code > 0) return code;
    } catch (_) {
      /* web fallback */
    }
  }
  return APP_VERSION.versionCode;
}

async function checkOnce(showPrompt) {
  try {
    const localCode = await localVersionCode();
    const response = await fetch(`${publicOrigin()}/downloads/version.json`, { cache: 'no-store' });
    if (!response.ok) return;
    const remote = await response.json();
    const remoteCode = Number(remote.versionCode || 0);
    if (!remoteCode || remoteCode <= localCode) return;
    const dismissed = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed === remoteCode) return;
    showPrompt?.({
      versionName: remote.versionName || remote.version,
      versionCode: remoteCode,
      apkUrl: remote.apkUrl || '/downloads/genz-whatsapp.apk',
      size: remote.size
    });
  } catch (error) {
    console.warn('[update] check skipped', error?.message || error);
  }
}

export function initUpdateChecker(showPrompt) {
  if (started) return () => {};
  started = true;
  const run = () => checkOnce(showPrompt);
  run();
  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  document.addEventListener('visibilitychange', onVisible);
  let appHandle = { remove: () => {} };
  if (isNative()) {
    appHandle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) run();
    });
  }
  return () => {
    started = false;
    document.removeEventListener('visibilitychange', onVisible);
    appHandle.remove?.();
  };
}

export function dismissUpdatePrompt(versionCode) {
  sessionStorage.setItem(DISMISS_KEY, String(versionCode || ''));
}
