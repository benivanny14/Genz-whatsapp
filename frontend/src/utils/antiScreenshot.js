const OVERLAY_ID = 'genz-anti-screenshot-overlay';
import toast from 'react-hot-toast';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { Capacitor } from '@capacitor/core';

let listenersAttached = false;
let enabled = false;
let onScreenshotAttempt = null;

// Reference counting for PrivacyScreen to handle both chat-level mod and ViewOnce
let privacyScreenRefCount = 0;

const ensureOverlay = () => {
  let el = document.getElementById(OVERLAY_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="genz-screenshot-blocked-msg">Screenshots are disabled in GENZ</div>';
    document.body.appendChild(el);
  }
  return el;
};

export const triggerScreenshotWarning = () => {
  if (!enabled) return;
  const overlay = ensureOverlay();
  document.body.classList.add('screenshot-warning');
  overlay.classList.add('active');
  
  // Notify via callback if registered (for socket notification)
  if (onScreenshotAttempt) {
    onScreenshotAttempt();
  }
  
  // FIX: this used to check `window.showToast`, a global that's never set
  // anywhere in the app, so the warning toast silently never fired.
  toast('⚠️ Screenshots are disabled in this chat', { icon: '🚫', duration: 2000 });
  
  console.warn('[Anti-Screenshot] Screenshot attempt blocked!');
  
  window.setTimeout(() => {
    overlay.classList.remove('active');
    document.body.classList.remove('screenshot-warning');
  }, 1400);
};

export const setScreenshotAttemptCallback = (callback) => {
  onScreenshotAttempt = callback;
};

// FIX: view-once protection (modal / voice-note playback) used to
// unconditionally reset this callback to `null` when it finished, which
// silently wiped out the conversation-level "anti-screenshot" mod's own
// callback if that mod was already active — the sender would stop getting
// screenshot notices for the rest of the chat after the first view-once was
// viewed. Callers should read the previous callback with this getter before
// overwriting it, and restore that value (not null) on cleanup.
export const getScreenshotAttemptCallback = () => onScreenshotAttempt;

export const applyAntiScreenshot = async (shouldEnable) => {
  enabled = Boolean(shouldEnable);
  const root = document.documentElement;
  const body = document.body;

  // Handle PrivacyScreen for native platforms (Android FLAG_SECURE)
  if (Capacitor.isNativePlatform()) {
    try {
      if (shouldEnable) {
        privacyScreenRefCount++;
        if (privacyScreenRefCount === 1) {
          await PrivacyScreen.enable();
        }
      } else {
        privacyScreenRefCount = Math.max(0, privacyScreenRefCount - 1);
        if (privacyScreenRefCount === 0) {
          await PrivacyScreen.disable();
        }
      }
    } catch (e) {
      console.warn('PrivacyScreen not available:', e);
    }
  }

  // Web/desktop CSS overlay protection (second layer)
  if (enabled) {
    root.classList.add('no-screenshot');
    body.classList.add('no-screenshot');
    ensureOverlay();
  } else {
    root.classList.remove('no-screenshot');
    body.classList.remove('no-screenshot');
    document.getElementById(OVERLAY_ID)?.classList.remove('active');
    body.classList.remove('screenshot-warning');
  }
};

const blockCopy = (e) => {
  if (!enabled) return;
  e.preventDefault();
};

const blockContextMenu = (e) => {
  if (!enabled) return;
  e.preventDefault();
};

const onVisibilityChange = () => {
  if (enabled && document.visibilityState === 'hidden') {
    triggerScreenshotWarning();
  }
};

const onKeyDown = (e) => {
  if (!enabled) return;
  if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
    triggerScreenshotWarning();
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
    triggerScreenshotWarning();
  }
};

const onBlur = () => {
  if (!enabled) return;
  if (document.activeElement?.tagName === 'IFRAME') {
    triggerScreenshotWarning();
  }
};

export const initAntiScreenshotListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('blur', onBlur);
  document.addEventListener('copy', blockCopy);
  document.addEventListener('cut', blockCopy);
  document.addEventListener('contextmenu', blockContextMenu);
};

export const isAntiScreenshotActive = () => enabled;

// ── Ref-counted PrivacyScreen helpers for ViewOnce / one-shot usage ──
// These allow ViewOnce modals and other one-shot viewers to request
// FLAG_SECURE without conflicting with the chat-level anti-screenshot mod.
// Each caller must pair an enable with a disable; the actual native call
// only fires on the first enable and the last disable.

/**
 * Request FLAG_SECURE (ref-counted). Safe to call from any component.
 * Will not disable if the chat-level anti-screenshot mod is also active.
 */
export const enablePrivacyScreen = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    privacyScreenRefCount++;
    if (privacyScreenRefCount === 1) {
      await PrivacyScreen.enable();
    }
  } catch (e) {
    console.warn('[Anti-Screenshot] PrivacyScreen.enable failed:', e);
  }
};

/**
 * Release one FLAG_SECURE reference. Only disables the native flag when
 * no callers remain (refCount === 0) AND the chat-level mod is off.
 */
export const disablePrivacyScreen = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    privacyScreenRefCount = Math.max(0, privacyScreenRefCount - 1);
    if (privacyScreenRefCount === 0 && !enabled) {
      await PrivacyScreen.disable();
    }
  } catch (e) {
    console.warn('[Anti-Screenshot] PrivacyScreen.disable failed:', e);
  }
};

