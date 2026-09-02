#!/usr/bin/env node
/**
 * build-apk.js — builds the signed release APK for GENZ WhatsApp.
 *
 * Steps:
 *   1. Build the web app with production API env (VITE_API_URL etc.)
 *   2. Remove genz-whatsapp.apk from dist so the APK isn't bundled inside itself
 *   3. npx cap sync android  (copies dist into the native assets)
 *   4. ./gradlew assembleRelease (signed via keystore.properties — gitignored)
 *   5. Copy app-release.apk → public/genz-whatsapp.apk (downloadable from the site)
 *   6. Write public/version.json (version, sha256, size) for the login page
 *
 * Requires (gitignored, machine-local):
 *   - frontend/android/local.properties     → sdk.dir=...
 *   - frontend/android/keystore.properties  → storeFile/storePassword/keyAlias/keyPassword
 *   - frontend/android/genz-release.keystore
 *
 * Usage:
 *   npm run apk:build            # uses VITE_API_URL/VITE_SOCKET_URL from env (defaults to prod Render URL)
 */
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync, rmSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeVersionJson } from './lib/version-json.js';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const androidDir = resolve(root, 'android');
const distDir = resolve(root, 'dist');
const releaseApk = resolve(androidDir, 'app/build/outputs/apk/release/app-release.apk');
const publicApk = resolve(root, 'public/genz-whatsapp.apk');

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', shell: true, cwd: root, ...opts });

// The API (and its MongoDB) lives on genz-whatsapp.onrender.com — the same
// host the deployed web app bakes (Render env VITE_API_URL). The APK must
// talk to that SAME API so APK and web users share one account database.
// genz-whatsapp-1.onrender.com is the UI/download host only. Overridable via
// env (e.g. VITE_API_URL=https://genz-whatsapp-1.onrender.com/api).
const apiUrl = process.env.VITE_API_URL || 'https://genz-whatsapp.onrender.com/api';
const socketUrl = process.env.VITE_SOCKET_URL || 'https://genz-whatsapp.onrender.com';

console.log('[apk] 0/6 Pre-build checks (icons, manifest, keystore, version.json)');
// Fail fast before the expensive web build + gradle run. See pre-build-check.js.
run('node scripts/pre-build-check.js');

console.log(`[apk] 1/6 Building web app (API: ${apiUrl})`);
run('npm run build', { env: { ...process.env, VITE_API_URL: apiUrl, VITE_SOCKET_URL: socketUrl } });

console.log('[apk] 2/6 Removing embedded APK from dist (avoid self-bundling)');
if (existsSync(resolve(distDir, 'genz-whatsapp.apk'))) rmSync(resolve(distDir, 'genz-whatsapp.apk'));

console.log('[apk] 3/6 npx cap sync android');
run('npx cap sync android');

console.log('[apk] 4/6 gradlew assembleRelease');
// On Windows, cmd.exe cannot resolve a bare batch name when the cwd path
// contains spaces, so always invoke the wrapper by its full quoted path.
const gradlew = resolve(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(`"${gradlew}" assembleRelease --no-daemon`, { cwd: androidDir });

// Verify signing — reject debug-signed APKs in local builds, warn in CI.
const signingReport = execSync(`"${gradlew}" signingReport --no-daemon`, {
  encoding: 'utf8',
  shell: true,
  cwd: androidDir
});
const releaseSigning = signingReport.match(/Variant: release[\s\S]*?Config: release[\s\S]*?Store: ([^\r\n]+)/);
if (!releaseSigning || /debug\.keystore/i.test(releaseSigning[1])) {
  if (process.env.CI) {
    console.warn('[apk] ⚠️  DEBUG-signed APK — set ANDROID_KEYSTORE_BASE64 + ANDROID_KEYSTORE_PROPERTIES secrets for release signing');
  } else {
    throw new Error('Release signing verification failed: the APK must use the configured release keystore, not the debug key.');
  }
} else {
  console.log(`[apk] Release signing verified: ${releaseSigning[1].trim()}`);
}

console.log('[apk] 5/6 Copying signed APK → public/genz-whatsapp.apk');
// On Windows a running dev server can hold a lock on the destination file;
// unlink first (best-effort) so the copy always lands fresh.
try { rmSync(publicApk, { force: true }); } catch { /* ignore */ }
copyFileSync(releaseApk, publicApk);
console.log(`[apk] Done → ${publicApk} (${existsSync(publicApk) ? (statSync(publicApk).size / 1024 / 1024).toFixed(1) : 0} MB)`);

// ── 6/6 Write public/version.json so users can see/verify the build ──
// Served at /version.json and shown next to the Download button on the login
// page (see src/pages/Login.jsx). sha256 lets users verify the file they got
// really is the one we signed. The writer lives in scripts/lib/version-json.js
// (shared with the release-script smoke tests).
const gradle = readFileSync(resolve(androidDir, 'app/build.gradle'), 'utf8');
const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1] || '0.0.0';
const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
const { sha256 } = writeVersionJson({
  root,
  versionName,
  versionCode,
  apkPath: publicApk,
});
console.log(`[apk] version.json → v${versionName} (code ${versionCode}, sha256 ${sha256.slice(0, 12)}…)`);
