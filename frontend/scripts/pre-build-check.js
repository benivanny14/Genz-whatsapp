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
 *   [WARN]      keystore.properties / genz-release.keystore missing (build
 *               would fall back to the debug signature — never ship that)
 *   [WARN]      google-services.json missing (FCM push disabled — no crash)
 *   [REQUIRED]  public/version.json exists and versionCode >= Android's
 *               build.gradle versionCode (bump via `npm run bump:apk`)
 *   [WARN]      VITE_API_URL, if set, is HTTPS (production URL)
 */
import { existsSync, readFileSync } from 'node:fs';
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
console.log('[pre-build] 1/5 PWA icons');
for (const icon of REQUIRED_ICONS) {
  if (!existsSync(resolve(root, icon))) fail(`Missing icon: ${icon}`);
}
if (REQUIRED_ICONS.every((i) => existsSync(resolve(root, i)))) {
  console.log(`  ✓ ${REQUIRED_ICONS.length} icons present`);
}

// ── 2. manifest.json validity ────────────────────────────────────────────
console.log('[pre-build] 2/5 manifest.json');
const manifestPath = resolve(root, 'public/manifest.json');
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const field of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!manifest[field]) fail(`manifest.json missing required field "${field}"`);
  }
  if (!failed) console.log(`  ✓ manifest.json valid (${manifest.name})`);
} catch (err) {
  fail(`manifest.json is not valid JSON: ${err.message}`);
}

// ── 3. Keystore (warn only) ──────────────────────────────────────────────
console.log('[pre-build] 3/5 keystore');
const keystoreProps = resolve(root, 'android/keystore.properties');
const keystoreFile = resolve(root, 'android/genz-release.keystore');
if (existsSync(keystoreProps) && existsSync(keystoreFile)) {
  console.log('  ✓ release keystore found');
} else {
  warn('keystore.properties / genz-release.keystore missing — the build will sign with the DEBUG key. Do NOT ship a debug-signed APK (users cannot update it later). See docs/MWONGOZO_APK_NA_DEPLOY.md');
}

// ── 4. google-services.json (warn only — FCM optional) ───────────────────
console.log('[pre-build] 4/5 google-services.json (FCM)');
if (existsSync(resolve(root, 'android/app/google-services.json'))) {
  console.log('  ✓ FCM configured (push notifications enabled)');
} else {
  warn('google-services.json missing — FCM push disabled (app works fine, no crash). See docs/FCM_SETUP_GUIDE.md');
}

// ── 5. version.json vs build.gradle ──────────────────────────────────────
console.log('[pre-build] 5/5 version.json');
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

// ── 6. VITE_API_URL (warn only) ──────────────────────────────────────────
const apiUrl = process.env.VITE_API_URL;
if (apiUrl && !/^https:\/\//.test(apiUrl)) {
  warn(`VITE_API_URL (${apiUrl}) is not HTTPS — production APK builds should point at the HTTPS API (default is https://genz-whatsapp.onrender.com/api)`);
}

console.log(failed ? '\n[pre-build] ❌ FAILED — fix the errors above, then rebuild.' : '\n[pre-build] ✅ All required checks passed.');
process.exit(failed ? 1 : 0);
