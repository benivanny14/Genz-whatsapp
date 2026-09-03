#!/usr/bin/env node
/**
 * pre-build-check.js — verifies everything the APK build needs BEFORE
 * `npm run apk:build` spends minutes compiling. Runs as the first step of
 * `apk:build` (see frontend/package.json) and can also be run standalone:
 *
 *   node scripts/pre-build-check.js
 *
 * Checks (exit code 1 only for hard failures; warnings are non-fatal):
 *   [REQUIRED]  PWA icons exist (icon-192/512, favicon-32, apple-touch-icon)
 *   [REQUIRED]  public/manifest.json is valid JSON with required fields
 *   [REQUIRED]  every icon referenced by manifest.json actually exists
 *   [REQUIRED]  public/screenshots/ has at least 2 images (PWA install)
 *   [REQUIRED]  capacitor.config.json has NO server.url (bundled/offline APK)
 *   [REQUIRED]  vite.config.js registers VitePWA in its plugins array
 *   [REQUIRED]  keystore.properties / genz-release.keystore present (release
 *               builds must never fall back to the debug signature)
 *   [REQUIRED]  google-services.json for release builds (FCM push)
 *   [WARN]      google-services.json missing in dev builds (FCM disabled)
 *   [REQUIRED]  public/version.json exists and versionCode >= Android's
 *               build.gradle versionCode (bump via `npm run bump:apk`)
 *   [REQUIRED]  VITE_API_URL is set and HTTPS (production APK URL)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let failed = false;
const fail = (msg) => { console.error(`❌ ${msg}`); failed = true; };
const warn = (msg) => { console.warn(`⚠️  ${msg}`); };

// ── 1. PWA icons ─────────────────────────────────────────────────────────
const REQUIRED_ICONS = [
  'public/icons/icon-192x192.png',
  'public/icons/icon-512x512.png',
  'public/icons/favicon-32x32.png',
  'public/icons/apple-touch-icon.png',
];
console.log('[pre-build] 1/8 PWA icons');
for (const icon of REQUIRED_ICONS) {
  if (!existsSync(resolve(root, icon))) fail(`Missing icon: ${icon}`);
}
if (REQUIRED_ICONS.every((i) => existsSync(resolve(root, i)))) {
  console.log(`  ✓ ${REQUIRED_ICONS.length} icons present`);
}

// ── 2. manifest.json validity + referenced icons ─────────────────────────
console.log('[pre-build] 2/8 manifest.json');
const manifestPath = resolve(root, 'public/manifest.json');
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const field of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!manifest[field]) fail(`manifest.json missing required field "${field}"`);
  }
  // Every icon src listed in the manifest must exist on disk (a missing icon
  // silently degrades the PWA install / splash on some devices).
  const iconSrcs = (manifest.icons || []).map((i) => i?.src).filter(Boolean);
  for (const src of iconSrcs) {
    // Manifest srcs are site-relative (/icons/… → public/icons/…).
    const clean = src.replace(/^\//, '');
    if (!existsSync(resolve(root, 'public', clean))) {
      fail(`manifest.json references missing icon: ${src}`);
    }
  }
  if (!failed) console.log(`  ✓ manifest.json valid (${manifest.name}) — ${iconSrcs.length} icons referenced and present`);
} catch (err) {
  fail(`manifest.json is not valid JSON: ${err.message}`);
}

// ── 3. PWA screenshots (Chrome install prompt wants >= 2) ─────────────────
console.log('[pre-build] 3/8 screenshots');
const screenshotsDir = resolve(root, 'public/screenshots');
if (existsSync(screenshotsDir)) {
  const shots = readdirSync(screenshotsDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (shots.length >= 2) console.log(`  ✓ ${shots.length} screenshots present`);
  else fail(`public/screenshots/ has only ${shots.length} image(s) — Chrome's install prompt wants at least 2`);
} else {
  fail('public/screenshots/ directory missing — Chrome install prompt wants at least 2 screenshots');
}

// ── 4. capacitor.config.json — bundled APK only ──────────────────────────
console.log('[pre-build] 4/8 capacitor.config.json');
const capacitorPath = resolve(root, 'capacitor.config.json');
try {
  const cap = JSON.parse(readFileSync(capacitorPath, 'utf8'));
  if (cap.server?.url) {
    fail('capacitor.config.json has server.url — the APK must BUNDLE the web app for true offline support. Remove the "server.url" key (see docs).');
  } else {
    console.log('  ✓ no server.url — APK bundles the built app (offline-capable)');
  }
} catch (err) {
  fail(`capacitor.config.json is not valid JSON: ${err.message}`);
}

// ── 5. vite.config.js registers VitePWA ──────────────────────────────────
console.log('[pre-build] 5/8 vite.config.js VitePWA');
const viteConfig = readFileSync(resolve(root, 'vite.config.js'), 'utf8');
if (/VitePWA/.test(viteConfig) && /plugins\s*:/.test(viteConfig)) {
  console.log('  ✓ VitePWA registered in plugins');
} else {
  fail('vite.config.js does not register VitePWA in its plugins array — add VitePWA (registerType autoUpdate, manifest false).');
}

// ── 6. Keystore ─────────────────────────────────────────────────────────
console.log('[pre-build] 6/8 keystore');
const keystoreProps = resolve(root, 'android/keystore.properties');
const keystoreFile = resolve(root, 'android/genz-release.keystore');
if (existsSync(keystoreProps) && existsSync(keystoreFile)) {
  console.log('  ✓ release keystore found');
} else if (process.env.CI) {
  warn('keystore.properties / genz-release.keystore missing — CI build will be DEBUG-signed (set ANDROID_KEYSTORE_BASE64 + ANDROID_KEYSTORE_PROPERTIES secrets for release builds)');
} else {
  fail('keystore.properties / genz-release.keystore missing — release APK signing cannot fall back to the DEBUG key. See docs/MWONGOZO_APK_NA_DEPLOY.md');
}

// ── 7. google-services.json (FCM push notifications) ─────────────────────
console.log('[pre-build] 7/8 google-services.json (FCM)');
if (existsSync(resolve(root, 'android/app/google-services.json'))) {
  console.log('  ✓ FCM configured (push notifications enabled)');
} else if (process.env.CI || process.env.ANDROID_KEYSTORE_BASE64) {
  // Release builds in CI MUST have FCM — users won't know push is broken
  fail('google-services.json missing — release APK will have NO push notifications. Add FIREBASE_GOOGLE_SERVICES_JSON_B64 secret. See docs/FCM_SETUP_GUIDE.md');
} else {
  warn('google-services.json missing — FCM push disabled (app works fine, no crash). See docs/FCM_SETUP_GUIDE.md');
}

// ── 8. version.json vs build.gradle ──────────────────────────────────────
console.log('[pre-build] 8/8 version.json');
try {
  const versionJson = JSON.parse(readFileSync(resolve(root, 'public/version.json'), 'utf8'));
  const gradle = readFileSync(resolve(root, 'android/app/build.gradle'), 'utf8');
  const gradleCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
  const jsonCode = Number(versionJson.versionCode || 0);

  if (!versionJson.version) fail('version.json missing "version"');
  if (jsonCode < gradleCode) {
    fail(`version.json versionCode (${jsonCode}) is behind build.gradle (${gradleCode}) — run \`npm run bump:apk\` first`);
  } else if (jsonCode === gradleCode) {
    console.log(`  ✓ version.json v${versionJson.version} (code ${jsonCode}) matches build.gradle`);
  } else {
    warn(`version.json code ${jsonCode} is AHEAD of gradle ${gradleCode} — bump:apk may not have run; build will still proceed`);
  }
} catch (err) {
  fail(`version.json unreadable: ${err.message}`);
}

// ── 9. VITE_API_URL (required for APK builds) ────────────────────────────
console.log('[pre-build] 9/9 VITE_API_URL');
const apiUrl = process.env.VITE_API_URL;
if (!apiUrl) {
  // When run directly (not via build-apk.js which sets the env var), this
  // is a hard failure — a build without VITE_API_URL produces an APK that
  // falls back to /api (localhost), which silently breaks on real devices.
  if (process.env.CI) {
    warn('VITE_API_URL not set — build-apk.js should set this. APK will use Capacitor fallback (https://genz-whatsapp.onrender.com/api).');
  } else {
    fail('VITE_API_URL not set — APK would fall back to /api (localhost) and break on real devices. Set VITE_API_URL or use `npm run apk:build` which sets it automatically.');
  }
} else if (!/^https:\/\//.test(apiUrl)) {
  fail(`VITE_API_URL (${apiUrl}) is not HTTPS — production APK builds MUST use HTTPS.`);
} else {
  console.log(`  ✓ VITE_API_URL: ${apiUrl}`);
}

console.log(failed ? '\n[pre-build] ❌ FAILED — fix the errors above, then rebuild.' : '\n[pre-build] ✅ All required checks passed.');
process.exit(failed ? 1 : 0);
