import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Native Android back button handling for the Capacitor APK.
 *
 * Behaviour (native builds only — the web ignores this hook entirely):
 *   1. A chat conversation is open  → close it (back to the chat list)
 *   2. WebView can go back          → history.back() (settings, sub-pages)
 *   3. Main chat screen             → minimize the app (WhatsApp-style)
 *
 * `isCallActive` is passed by the caller: while a call screen is up we skip
 * registration so the OS/WebView keeps its default back behaviour (the call
 * screen owns the lifecycle).
 *
 * @param {object} opts
 * @param {boolean} opts.isConversationOpen  true when a chat is open
 * @param {() => void} [opts.onCloseConversation]  closes the open chat
 * @param {() => void} [opts.onExitRequest]   optional custom exit (e.g. confirm dialog)
 * @param {boolean} [opts.isCallActive]       skip while a call screen is visible
 */
export const useNativeBackButton = ({
  isConversationOpen = false,
  onCloseConversation,
  onExitRequest,
  isCallActive = false,
}) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    // During a call the call screen handles back itself — do not swallow it.
    if (isCallActive) return undefined;

    let handle;
    let removed = false;

    App.addListener('backButton', ({ canGoBack }) => {
      if (isConversationOpen) {
        onCloseConversation?.();
      } else if (canGoBack) {
        window.history.back();
      } else if (onExitRequest) {
        onExitRequest();
      } else {
        // WhatsApp behaviour on the main screen: minimize, don't kill the app.
        App.minimizeApp();
      }
    }).then((h) => {
      if (removed) h.remove();
      else handle = h;
    });

    return () => {
      removed = true;
      if (handle) handle.remove();
    };
  }, [isConversationOpen, onCloseConversation, onExitRequest, isCallActive]);
};

export default useNativeBackButton;
