import { Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { apkDownloadUrl } from '../utils/versionManifest';

/**
 * Floating "Pakua APK" button — visible to EVERY user on ALL pages.
 * Only hidden for native APK users (they already have the app).
 * Positioned bottom-right, above the mobile bottom nav.
 */
const DownloadApkFab = () => {
  if (Capacitor.isNativePlatform()) return null;

  return (
    <a
      href={apkDownloadUrl()}
      download="genz-whatsapp.apk"
      className="fixed right-4 z-[60] flex items-center gap-1.5 bg-[#00a884] hover:bg-[#00c795] text-white text-[11px] font-bold px-3 py-2 rounded-full shadow-lg shadow-[#00a884]/30 transition-all active:scale-95"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      title="Pakua Genz Messenger APK"
      data-testid="download-apk-fab"
    >
      <Download size={14} />
      <span>Pakua APK</span>
    </a>
  );
};

export default DownloadApkFab;
