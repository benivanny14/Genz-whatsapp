import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { getAppInfo, isNative } from '../services/capacitorBridge';

const DISMISS_KEY = 'genz-update-dismissed-version';

/**
 * In-app "new version available" banner — APK only.
 *
 * The web app ships as a direct-download APK (no Play Store auto-updates),
 * so we compare the *installed* native versionCode (from @capacitor/app)
 * against the latest one published in /version.json (written by
 * npm run apk:build). When a newer build exists we offer a one-tap download
 * of the new APK, which Android installs over the old one (same signature).
 *
 * Renders nothing on the web (no native app to update) and can be dismissed
 * for the current version.
 */
const UpdateBanner = () => {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    (async () => {
      try {
        const [info, manifest] = await Promise.all([
          getAppInfo(),
          fetch('/version.json')
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null),
        ]);
        if (cancelled || !info || !manifest) return;

        const installedCode = info.versionCode ?? info.build ?? 0;
        const latestCode = Number(manifest.versionCode || 0);
        if (latestCode > installedCode) {
          let dismissedVersion = null;
          try {
            dismissedVersion = localStorage.getItem(DISMISS_KEY);
          } catch { /* ignore storage errors */ }
          if (dismissedVersion !== String(manifest.versionCode)) {
            setUpdate({
              version: manifest.version,
              apkUrl: manifest.apkUrl || '/genz-whatsapp.apk',
            });
          }
        }
      } catch { /* ignore — banner is a nicety */ }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!update || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(update.versionCode || update.version));
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed bottom-20 inset-x-0 z-[9990] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 w-full max-w-md rounded-2xl border border-white/10 bg-[#0b141a]/95 backdrop-blur px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884]/20">
          <Download size={18} className="text-[#00a884]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Update available — v{update.version}</p>
          <p className="text-xs text-slate-400 truncate">
            Kuna version mpya ya GENZ. Install ili kupata features mpya.
          </p>
        </div>
        <a
          href={update.apkUrl}
          download="genz-whatsapp.apk"
          className="shrink-0 rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#00c795]"
        >
          Update
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss update banner"
          className="shrink-0 text-slate-500 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
