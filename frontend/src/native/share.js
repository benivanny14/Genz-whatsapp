import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export async function nativeShare(payload) {
  try {
    if (Capacitor.isPluginAvailable('Share')) {
      await Share.share(payload);
      return true;
    }
  } catch (error) {
    console.warn('[native] share failed', error);
  }
  if (navigator.share) {
    await navigator.share(payload);
    return true;
  }
  return false;
}
