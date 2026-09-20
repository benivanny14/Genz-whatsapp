import { App } from '@capacitor/app';
import { isNative } from './platform';

let lastBack = 0;
let toastFn = null;
let getChatState = () => ({ inChat: false, closeChat: () => {} });

export function configureBackButton({ toast, getState }) {
  toastFn = toast;
  if (typeof getState === 'function') getChatState = getState;
}

export function initBackButton() {
  if (!isNative()) return () => {};
  const handle = App.addListener('backButton', ({ canGoBack }) => {
    const { inChat, closeChat } = getChatState() || {};
    if (inChat) {
      closeChat?.();
      return;
    }
    const path = window.location.pathname || '/';
    if (path !== '/chat' && path !== '/' && canGoBack) {
      window.history.back();
      return;
    }
    const now = Date.now();
    if (now - lastBack < 2000) {
      App.exitApp();
      return;
    }
    lastBack = now;
    toastFn?.('Bonyeza tena kutoka');
  });
  return () => {
    handle.remove?.();
  };
}
