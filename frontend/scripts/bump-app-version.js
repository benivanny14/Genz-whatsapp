#!/usr/bin/env node
/**
 * bump-app-version.js — bumps the app version for both native targets and
 * writes public/version.json so the login page (and users) know which build
 * is current.
 *
 *   Android:  android/app/build.gradle  versionCode (+1) + versionName
 *   iOS:      ios/App/App.xcodeproj/project.pbxproj  CURRENT_PROJECT_VERSION (+1) + MARKETING_VERSION
 *
 * Usage:
 *   node scripts/bump-app-version.js [major|minor|patch]   # e.g. 1.0.0 -> 1.0.1
 *   node scripts/bump-app-version.js 2.1.0                 # explicit versionName
 *
 * The Android versionCode / iOS build number always increment by 1 — Android
 * requires it for every reinstall-over update, and it also drives the
 * "update available" banner on the login page (compare version.json with the
 * build you have installed).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gradlePath = resolve(root, 'android/app/build.gradle');
const pbxprojPath = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj');
const versionJsonPath = resolve(root, 'public/version.json');

const arg = process.argv[2];
if (arg && !/^(major|minor|patch)$/.test(arg) && !/^\d+\.\d+\.\d+$/.test(arg)) {
  console.error('Usage: node scripts/bump-app-version.js [major|minor|patch]  (or an explicit 1.2.3)');
  process.exit(1);
}

// ── read current versions ────────────────────────────────────────────────
const gradle = readFileSync(gradlePath, 'utf8');
const gradleVersionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const gradleVersionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);

const pbxproj = readFileSync(pbxprojPath, 'utf8');
const iosMarketingVersion = pbxproj.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim();
const iosBuildNumber = Number(pbxproj.match(/CURRENT_PROJECT_VERSION = (\d+);/)?.[1]);

if (!gradleVersionName || !Number.isFinite(gradleVersionCode)) {
  console.error('Could not parse versionCode/versionName from', gradlePath);
  process.exit(1);
}

// ── compute the new version ──────────────────────────────────────────────
let nextVersionName = arg;
if (!nextVersionName) nextVersionName = gradleVersionName;
else if (/^(major|minor|patch)$/.test(nextVersionName)) {
  const [maj, min, pat] = gradleVersionName.split('.').map(Number);
  nextVersionName = nextVersionName === 'major'
    ? `${maj + 1}.0.0`
    : nextVersionName === 'minor'
      ? `${maj}.${min + 1}.0`
      : `${maj}.${min}.${pat + 1}`;
}

console.log(`[bump] Android ${gradleVersionName} (code ${gradleVersionCode}) → ${nextVersionName} (code ${gradleVersionCode + 1})`);

// ── rewrite gradle ───────────────────────────────────────────────────────
writeFileSync(
  gradlePath,
  gradle
    .replace(/versionCode\s+\d+/, `versionCode ${gradleVersionCode + 1}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${nextVersionName}"`)
);

// ── rewrite iOS pbxproj (both config blocks) ─────────────────────────────
const iosNextBuild = (iosBuildNumber || 0) + 1;
// Keep iOS MARKETING_VERSION aligned with Android's versionName so users see
// the same version everywhere (build number still increments independently).
const nextIosVersion = nextVersionName;
console.log(`[bump] iOS ${iosMarketingVersion ?? '?'} (build ${iosBuildNumber ?? '?'}) → ${nextIosVersion} (build ${iosNextBuild})`);
if (existsSync(pbxprojPath)) {
  writeFileSync(
    pbxprojPath,
    pbxproj
      .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${iosNextBuild};`)
      .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nextIosVersion};`)
  );
}

// ── write public/version.json (sha256/size are filled in by build-apk.js) ─
// sha256/size are deliberately null here, NOT carried over from the previous
// release: apk:build.js fills them with the real values for the NEW apk.
// Carrying the old sha was actively misleading — the copy of version.json
// bundled inside the APK (via vite build → cap sync) would claim the
// PREVIOUS release's checksum. Null makes the placeholder unambiguous.
writeFileSync(
  versionJsonPath,
  JSON.stringify(
    {
      version: nextVersionName,
      versionCode: gradleVersionCode + 1,
      apkUrl: '/genz-whatsapp.apk',
      sha256: null,
      size: null,
      releasedAt: new Date().toISOString(),
    },
    null,
    2
  ) + '\n'
);

console.log(`[bump] wrote public/version.json → v${nextVersionName} (code ${gradleVersionCode + 1})`);
console.log('[bump] next: npm run apk:build  (fills sha256/size into version.json)');
