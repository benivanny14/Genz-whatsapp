import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'genz-install-prompt-dismissed-at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // don't nag more than once a week

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches ||
  window.navigator.standalone === true; // iOS Safari's own flag

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const wasRecentlyDismissed = () => {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
};

/**
 * Lets a user install this web app to their device via Chrome (Android/
 * desktop) using the real native install prompt, with a manual-instructions
 * fallback for iOS Safari, which doesn't support beforeinstallprompt at all.
 */
const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // iOS Safari never fires beforeinstallprompt — show the manual banner
    // after a short delay so it doesn't compete with initial load.
    let iosTimer;
    if (isIos() && !isStandalone()) {
      iosTimer = setTimeout(() => setVisible(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIosInstructions(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore storage errors (private mode, quota, etc.) */ }
  };

  const handleInstallClick = async () => {
    if (isIos()) {
      setShowIosInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-dark-surface/95 backdrop-blur-lg text-white rounded-xl shadow-xl border border-white/10 animate-in slide-in-from-bottom-2">
      {!showIosInstructions ? (
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-[#128C7E] flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Weka GENZ WhatsApp kwenye simu yako</p>
            <p className="text-xs text-white/60">Ifungue haraka kama app, hata bila kufungua kivinjari</p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Funga"
          >
            <X size={16} />
          </button>
          <button
            onClick={handleInstallClick}
            className="ml-1 px-3 py-2 bg-[#128C7E] hover:bg-[#0f7a6c] rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
          >
            Weka (Install)
          </button>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Jinsi ya kuweka kwenye iPhone</p>
            <button onClick={dismiss} className="p-1 hover:bg-white/10 rounded-lg" aria-label="Funga">
              <X size={16} />
            </button>
          </div>
          <ol className="text-xs text-white/70 space-y-1.5 list-decimal list-inside">
            <li>Bonyeza kitufe cha <Share size={12} className="inline mx-1" /> Share (chini ya Safari)</li>
            <li>Chagua "Add to Home Screen"</li>
            <li>Bonyeza "Add" juu kulia</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default InstallAppPrompt;
