import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getAppInfo } from '../services/capacitorBridge';
import { fetchVersionManifest, apkDownloadUrl, VERSION_MANIFEST_ORIGIN } from '../utils/versionManifest';
import { resolveApiBase } from '../utils/resolveApiBase';
import { getAuthToken } from '../utils/tokenStore';
import { trackUpdateEvent } from '../utils/updateAnalytics';

const BUNDLE_VERSION_CODE = Number(__GENZ_VERSION_CODE__ || 0);
const LAST_DOWNLOAD_KEY = 'genz-bg-update-downloaded';

// Register the native APKInstaller plugin (defined in
// android/.../APKInstallerPlugin.java). registerPlugin is a no-op on web,
// so this is safe to call unconditionally.
const APKInstaller = registerPlugin('APKInstaller');

/**
 * BackgroundUpdateManager — WhatsApp-style zero-interaction auto-update.
 *
 * On every app launch (APK only):
 *  1. Checks /api/updates/check and /version.json for a newer versionCode.
 *  2. If a newer version exists AND hasn't been downloaded yet, it calls the
 *     native APKInstaller plugin which:
 *       a) Downloads the APK via Android DownloadManager (background)
 *       b) Automatically opens the Android package installer
 *       c) User taps "Install" once → data is PRESERVED (same package+key)
 *  3. Tracks the downloaded versionCode so it doesn't re-download.
 *
 * For mandatory updates (gap >5 codes or mandatory flag), the ForceUpdateModal
 * blocks the entire app until the user installs.
 *
 * On the web this component renders nothing.
 */
const BackgroundUpdateManager = () => {
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

        // Resolve full URL
        const fullUrl = apkUrl.startsWith('http')
          ? apkUrl
          : `${VERSION_MANIFEST_ORIGIN}${apkUrl}`;

        trackUpdateEvent('bg_update_started', {
          version: latestVersion,
          versionCode: latestCode,
          mandatory,
        });

        // Try native plugin first — downloads APK and opens installer automatically
        try {
          await APKInstaller.install({
            url: fullUrl,
            filename: `genz-whatsapp-v${latestVersion}.apk`,
            version: latestVersion,
          });
          markDownloaded(latestCode);
          return;
        } catch (pluginErr) {
          console.warn('[BackgroundUpdate] APKInstaller plugin failed, falling back to anchor:', pluginErr?.message);
        }

        // Fallback: trigger download via anchor click (DownloadManager in MainActivity)
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

      } catch (err) {
        console.warn('[BackgroundUpdate] Check failed:', err?.message || err);
      }
    })();
  }, []);

  return null;
};

export default BackgroundUpdateManager;
