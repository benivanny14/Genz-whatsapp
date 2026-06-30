const OVERLAY_ID = 'genz-anti-screenshot-overlay';

let listenersAttached = false;
let enabled = false;
let onScreenshotAttempt = null;

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
  
  // Also show a toast notification
  if (window.showToast) {
    window.showToast('⚠️ Screenshot attempt detected!');
  }
  
  console.warn('[Anti-Screenshot] Screenshot attempt blocked!');
  
  window.setTimeout(() => {
    overlay.classList.remove('active');
    document.body.classList.remove('screenshot-warning');
  }, 1400);
};

export const setScreenshotAttemptCallback = (callback) => {
  onScreenshotAttempt = callback;
};

export const applyAntiScreenshot = (shouldEnable) => {
  enabled = Boolean(shouldEnable);
  const root = document.documentElement;
  const body = document.body;

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
