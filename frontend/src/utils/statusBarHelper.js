/**
 * statusBarHelper.js — Status bar styling for Capacitor APK.
 *
 * No-ops on web.
 */
import { Capacitor } from '@capacitor/core';

/**
 * Set status bar style and background color.
 * @param {Object} opts
 * @param {'dark'|'light'} [opts.style='dark']
 * @param {string} [opts.color='#111b21'] CSS hex color
 */
export const setStatusBar = async (opts = {}) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { style = 'dark', color = '#111b21' } = opts;

    await StatusBar.setStyle({
      style: style === 'dark' ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({ color });
  } catch (err) {
    console.error('Status bar error:', err);
  }
};

/** Hide status bar (full-screen views like status viewer). */
export const hideStatusBar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch {}
};

/** Show status bar. */
export const showStatusBar = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.show();
  } catch {}
};
