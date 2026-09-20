import { Capacitor } from '@capacitor/core';

let wakeLock = null;

async function loadKeepAwake() {
  try {
    return await import('@capacitor-community/keep-awake');
  } catch {
    try {
      return await import('@capacitor/keep-awake');
    } catch {
      return null;
    }
  }
}

export async function setKeepAwake(enabled) {
  try {
    const mod = await loadKeepAwake();
    const KeepAwake = mod?.KeepAwake;
    if (KeepAwake && Capacitor.isPluginAvailable('KeepAwake')) {
      if (enabled) await KeepAwake.keepAwake();
      else await KeepAwake.allowSleep();
      return;
    }
    if (enabled) {
      if (navigator.wakeLock?.request) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
      return;
    }
    await wakeLock?.release?.();
    wakeLock = null;
  } catch (error) {
    console.warn('[native] keep awake failed', error);
  }
}
