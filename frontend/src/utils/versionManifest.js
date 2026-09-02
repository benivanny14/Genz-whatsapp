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

// GitHub Releases APK URL — fast CDN, no server cold-start delay.
const GITHUB_REPO = 'benivanny14/Genz-whatsapp';

// Absolute APK download URL: GitHub Releases (fast, always available).
// Falls back to same-origin for bundled APKs or offline builds.
export const apkDownloadUrl = (relative = '/genz-whatsapp.apk') => {
  // On the web, always prefer GitHub Releases (fast CDN, no cold start)
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      // In bundled APK, use the production UI host
      return `${VERSION_MANIFEST_ORIGIN}${relative}`;
    }
  } catch {
    /* not in a browser */
  }
  // On web: try GitHub Releases first, fall back to same-origin
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/genz-whatsapp.apk`;
};
