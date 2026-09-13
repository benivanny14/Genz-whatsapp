import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getAppInfo } from '../services/capacitorBridge';
import { fetchVersionManifest, apkDownloadUrl, VERSION_MANIFEST_ORIGIN } from '../utils/versionManifest';
import { resolveApiBase } from '../utils/resolveApiBase';
import { getAuthToken } from '../utils/tokenStore';
import { trackUpdateEvent } from '../utils/updateAnalytics';

const BUNDLE_VERSION_CODE = Number(__GENZ_VERSION_CODE__ || 0);
const LAST_DOWNLOAD_KEY = 'genz-bg-update-downloaded';

/**
 * BackgroundUpdateManager — WhatsApp-style silent background update.
 *
 * On every app launch (mount):
 *  1. Checks /api/updates/check and /version.json for a newer versionCode.
 *  2. If a newer version exists AND the APK hasn't been downloaded yet this
 *     version, it auto-triggers a DownloadManager request (Android handles the
 *     download in the background, shows a progress notification, and shows an
 *     "Open" button when complete).
 *  3. Tracks the downloaded versionCode in localStorage so it doesn't
 *     re-download on every launch.
 *
 * The actual APK install is handled by Android's package installer — the user
 * taps the DownloadManager "Download complete" notification, Android opens the
 * APK, and since the package name + signing key match, it reinstalls OVER the
 * existing app. All user data (messages, media, settings) is preserved.
 *
 * On the web this component renders nothing and does nothing.
 */
const BackgroundUpdateManager = () => {
  const [progress, setProgress] = useState(null); // { version, downloading, done }
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    if (!Capacitor.isNativePlatform?.()) return;
    hasChecked.current = true;

    const DISMISS_KEY = 'genz-update-dismissed-version';

    const isDismissed = (vc) => {
      try { return localStorage.getItem(DISMISS_KEY) === String(vc); }
      catch { return false; }
    };

    const alreadyDownloaded = (vc) => {
      try { return localStorage.getItem(LAST_DOWNLOAD_KEY) === String(vc); }
      catch { return false; }
    };

    const markDownloaded = (vc) => {
      try { localStorage.setItem(LAST_DOWNLOAD_KEY, String(vc)); }
      catch { /* ignore */ }
    };

    (async () => {
      try {
        let latestVersion = null;
        let latestCode = 0;
        let apkUrl = null;
        let changelog = '';
        let mandatory = false;

        // Strategy 1: Database-based check
        try {
          const currentCode = BUNDLE_VERSION_CODE || 0;
          const token = getAuthToken();
          const res = await fetch(
            `${resolveApiBase()}/updates/check?currentVersionCode=${currentCode}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          const data = await res.json();
          if (data.success && data.update) {
            latestVersion = data.update.version;
            latestCode = data.update.versionCode;
            apkUrl = data.update.downloadUrl;
            changelog = data.update.changelog || '';
            mandatory = data.update.mandatory || false;
          }
        } catch { /* fall through */ }

        // Strategy 2: version.json fallback
        if (!latestCode) {
          const manifest = await fetchVersionManifest();
          if (manifest) {
            const code = Number(manifest.versionCode || 0);
            if (code > BUNDLE_VERSION_CODE) {
              latestVersion = manifest.version;
              latestCode = code;
              apkUrl = manifest.apkUrl || apkDownloadUrl();
              changelog = (manifest.changes || []).join('. ');
            }
          }
        }

        if (!latestCode || !apkUrl) return;

        const installedCode = BUNDLE_VERSION_CODE || 0;
        if (latestCode <= installedCode) return;
        if (isDismissed(latestCode)) return;
        if (alreadyDownloaded(latestCode)) return;

        // Auto-download: resolve URL
        const fullUrl = apkUrl.startsWith('http')
          ? apkUrl
          : `${VERSION_MANIFEST_ORIGIN}${apkUrl}`;

        setProgress({ version: latestVersion, downloading: true, done: false });

        trackUpdateEvent('bg_update_started', {
          version: latestVersion,
          versionCode: latestCode,
          mandatory,
        });

        // Trigger Android DownloadManager via hidden anchor click.
        // The native DownloadListener in MainActivity picks this up and
        // routes it to DownloadManager, which handles:
        //   - Background download with progress notification
        //   - "Download complete → tap to install" notification
        //   - Opening the APK via the package installer
        const a = document.createElement('a');
        a.href = fullUrl;
        a.download = `genz-whatsapp-v${latestVersion}.apk`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        markDownloaded(latestCode);

        setProgress({ version: latestVersion, downloading: false, done: true });

        // Clear progress indicator after 5 seconds
        setTimeout(() => setProgress(null), 5000);

      } catch (err) {
        console.warn('[BackgroundUpdate] Check failed:', err?.message || err);
      }
    })();
  }, []);

  // Render nothing — this is a silent background process.
  // The progress toast is shown via the UpdateBanner or this component.
  return null;
};

export default BackgroundUpdateManager;
