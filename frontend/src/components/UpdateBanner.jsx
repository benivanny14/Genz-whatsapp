import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { getAppInfo, isNative } from '../services/capacitorBridge.js';
import { trackUpdateEvent } from '../utils/updateAnalytics.js';
import { fetchVersionManifest, apkDownloadUrl } from '../utils/versionManifest.js';

const DISMISS_KEY = 'genz-update-dismissed-version';

// Injected at build time from public/version.json (see vite.config.js) — the
// versionCode this bundle was BUILT with. On the web there is no native
// versionCode, so this is the "installed" baseline the served /version.json
// is compared against.
const BUNDLE_VERSION_CODE = Number(__GENZ_VERSION_CODE__ || 0);

/**
 * "New version available" banner — native APK and web.
 *
 * The app ships as a direct-download APK (no Play Store auto-updates), so on
 * Android we compare the *installed* native versionCode (from @capacitor/app)
 * against the latest one published in /version.json (written by
 * npm run apk:build). When a newer build exists we offer a one-tap download
 * of the new APK, which Android installs over the old one (same signature).
 *
 * On the web there is no installed versionCode — instead the banner compares
 * the served /version.json against __GENZ_VERSION_CODE__, the versionCode the
 * running bundle was built with. A stale cached bundle (user never reloaded
 * since a deploy) sees manifest > bundle and offers a Reload that pulls the
 * fresh app shell. Up-to-date bundles show nothing.
 *
 * Can be dismissed per version on both platforms.
 */
const UpdateBanner = () => {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const isDismissed = (versionCode) => {
      try {
        return localStorage.getItem(DISMISS_KEY) === String(versionCode);
      } catch {
        return false;
      }
    };

    const fetchManifest = () => fetchVersionManifest();

    (async () => {
      const manifest = await fetchManifest();
      if (cancelled || !manifest) return;
      const latestCode = Number(manifest.versionCode || 0);

      const analytics = {
        version: manifest.version || '',
        versionCode: latestCode,
        platform: isNative() ? 'apk' : 'web',
      };

      if (isNative()) {
        const info = await getAppInfo().catch(() => null);
        if (cancelled || !info) return;
        const installedCode = info.versionCode ?? info.build ?? 0;
        if (latestCode > installedCode && !isDismissed(latestCode)) {
          setUpdate({
            version: manifest.version,
            versionCode: latestCode,
            isWeb: false,
            // The new APK is served by the app host itself (same-origin on
            // web; absolute production URL inside the bundled APK).
            apkUrl: manifest.apkUrl || apkDownloadUrl(),
          });
          trackUpdateEvent('update_shown', analytics);
        }
        return;
      }

      // Web: a bundle is stale when the served manifest is newer than the
      // versionCode this build was compiled with. Don't mark anything "seen"
      // here — an ignored banner keeps showing on every visit until the user
      // reloads into the fresh bundle (which then reports manifest === bundle
      // and shows nothing). Dismiss is the per-version opt-out.
      if (latestCode > BUNDLE_VERSION_CODE && !isDismissed(latestCode)) {
        setUpdate({
          version: manifest.version,
          versionCode: latestCode,
          isWeb: true,
        });
        trackUpdateEvent('update_shown', analytics);
      }
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
    trackUpdateEvent('update_dismissed', {
      version: update.version,
      versionCode: update.versionCode,
      platform: isNative() ? 'apk' : 'web',
    });
  };

  return (
    <div className="fixed bottom-20 inset-x-0 z-[9990] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 w-full max-w-md rounded-2xl border border-white/10 bg-[#0b141a]/95 backdrop-blur px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884]/20">
          {update.isWeb ? (
            <RefreshCw size={18} className="text-[#00a884]" />
          ) : (
            <Download size={18} className="text-[#00a884]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Update available — v{update.version}</p>
          <p className="text-xs text-slate-400 truncate">
            {update.isWeb
              ? 'Kuna version mpya ya GENZ. Reload ili kupata features mpya.'
              : 'Kuna version mpya ya GENZ. Install ili kupata features mpya.'}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {update.isWeb ? (
            <button
              type="button"
              onClick={() => {
                trackUpdateEvent('update_reload_tapped', {
                  version: update.version,
                  versionCode: update.versionCode,
                  platform: 'web',
                });
                window.location.reload();
              }}
              className="rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#00c795]"
            >
              Reload
            </button>
          ) : (
            <>
              <a
                href={update.apkUrl}
                onClick={() =>
                  trackUpdateEvent('update_tapped', {
                    version: update.version,
                    versionCode: update.versionCode,
                    platform: 'apk',
                  })
                }
                className="rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#00c795]"
              >
                Update
              </a>
            </>
          )}
        </div>
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
