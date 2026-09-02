// The APK now BUNDLES the web app (no capacitor.config `server.url`), so inside
// the native WebView a relative fetch('/version.json') resolves against the
// local capacitor://localhost origin and fails. The version rows, the update
// banner and the APK download link must fall back to the production UI host —
// the same origin that serves the site, /version.json and /genz-whatsapp.apk —
// so APK users still see the current release and can update. On the web the
// relative URL works and is used first.
export const VERSION_MANIFEST_ORIGIN = 'https://genz-whatsapp-1.onrender.com';

// Fetch version.json (relative first — the web/deployed app; absolute fallback
// for the bundled APK). Never throws: callers treat null as "no data".
export const fetchVersionManifest = (path = '/version.json') =>
  fetch(path)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() =>
      fetch(`${VERSION_MANIFEST_ORIGIN}${path}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
    );

const GITHUB_REPO = 'benivanny14/Genz-whatsapp';

// APK download URL: GitHub Releases CDN (fast, always available).
// Falls back to same-origin for bundled APKs.
export const apkDownloadUrl = (relative = '/genz-whatsapp.apk') => {
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      return `${VERSION_MANIFEST_ORIGIN}${relative}`;
    }
  } catch {
    /* not in a browser */
  }
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/genz-whatsapp.apk`;
};
