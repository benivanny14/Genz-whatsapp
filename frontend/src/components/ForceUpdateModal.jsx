import React, { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getAppInfo, isNative, downloadUrl } from '../services/capacitorBridge';
import { fetchVersionManifest, apkDownloadUrl, VERSION_MANIFEST_ORIGIN } from '../utils/versionManifest';
import { resolveApiBase } from '../utils/resolveApiBase';
import { getAuthToken } from '../utils/tokenStore';
import { trackUpdateEvent } from '../utils/updateAnalytics';

const BUNDLE_VERSION_CODE = Number(__GENZ_VERSION_CODE__ || 0);
const APKInstaller = registerPlugin('APKInstaller');

/**
 * Full-screen mandatory update modal — blocks the entire app until the user
 * installs the new version. Used when `mandatory: true` is set on an Update
 * record in the database, or when version gap is >5 codes (security patch).
 *
 * Unlike UpdateBanner, this CANNOT be dismissed (no X button).
 */
const ForceUpdateModal = () => {
  const [update, setUpdate] = useState(null);
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const checkForcedUpdate = useCallback(async () => {
    try {
      // Strategy 1: API-based check
      const currentCode = BUNDLE_VERSION_CODE || 0;
      const token = getAuthToken();
      const res = await fetch(
        `${resolveApiBase()}/updates/check?currentVersionCode=${currentCode}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = await res.json();
      if (data.success && data.update?.mandatory) {
        setUpdate({
          version: data.update.version,
          versionCode: data.update.versionCode,
          changelog: data.update.changelog,
          apkUrl: data.update.downloadUrl,
          mandatory: true,
        });
        trackUpdateEvent('force_update_shown', {
          version: data.update.version,
          versionCode: data.update.versionCode,
        });
        return;
      }

      // Strategy 2: version.json fallback — force if version gap > 5
      const manifest = await fetchVersionManifest();
      if (!manifest) return;
      const latestCode = Number(manifest.versionCode || 0);
      if (isNative()) {
        const info = await getAppInfo().catch(() => null);
        if (!info) return;
        const installedCode = info.versionCode ?? info.build ?? 0;
        const gap = latestCode - installedCode;
        if (gap > 5) {
          setUpdate({
            version: manifest.version,
            versionCode: latestCode,
            changelog: (manifest.changes || []).join('. '),
            apkUrl: manifest.apkUrl || apkDownloadUrl(),
            mandatory: true,
          });
          trackUpdateEvent('force_update_shown', {
            version: manifest.version,
            versionCode: latestCode,
            gap,
          });
        }
      }
    } catch {
      // Silent fail — don't block app on network error
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkForcedUpdate();
  }, [checkForcedUpdate]);

  const handleDownload = async () => {
    if (!update?.apkUrl) return;
    try {
      setDownloading(true);
      const url = update.apkUrl.startsWith('http')
        ? update.apkUrl
        : `${VERSION_MANIFEST_ORIGIN}${update.apkUrl}`;

      // Use native APKInstaller plugin on APK — opens installer directly
      if (Capacitor.isNativePlatform?.()) {
        try {
          await APKInstaller.install({
            url,
            filename: `genz-whatsapp-v${update.version}.apk`,
            version: update.version,
          });
          trackUpdateEvent('force_update_tapped', {
            version: update.version,
            versionCode: update.versionCode,
          });
          return;
        } catch (pluginErr) {
          console.warn('[ForceUpdate] APKInstaller failed, falling back:', pluginErr?.message);
        }
      }

      // Web/fallback: anchor download
      downloadUrl(url, `genz-whatsapp-v${update.version}.apk`);
      trackUpdateEvent('force_update_tapped', {
        version: update.version,
        versionCode: update.versionCode,
      });
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (checking || !update) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0b141a]">
      <div className="w-full max-w-sm mx-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
            <ShieldAlert size={40} className="text-orange-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Update Inahitajika</h1>
        <p className="text-gray-400 text-sm mb-1">
          GENZ Messenger v{update.version} imetolewa
        </p>
        <p className="text-gray-500 text-xs mb-6">
          Sasisha ili kuendelea kutumia programme hii. Versha ya zamani haifungii tena.
        </p>

        {update.changelog && (
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-gray-400 mb-2">Mabadiliko:</p>
            <p className="text-sm text-gray-300">{update.changelog}</p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-[#00a884] text-white py-3 rounded-xl font-bold text-base hover:bg-[#00c795] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {downloading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Inapakua...
            </>
          ) : (
            <>
              <Download size={18} />
              Pakua & Sasisha Sasa
            </>
          )}
        </button>

        <p className="text-gray-600 text-[11px] mt-4">
          Baada ya kupakua, fungua APK mpya kuisakinisha.
        </p>
      </div>
    </div>
  );
};

export default ForceUpdateModal;
