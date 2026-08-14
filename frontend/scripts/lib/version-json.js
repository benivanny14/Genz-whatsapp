// Shared writer for public/version.json — used by build-apk.js to fill the
// REAL sha256/size after the APK is built, and exercised by the release
// script smoke tests (src/tests/releaseScripts.test.js).
//
// `bump-app-version.js` deliberately does NOT use this: it writes the
// version.json BEFORE the build, with `sha256: null` / `size: null` so the
// copy bundled inside the APK is an honest placeholder instead of claiming
// the previous release's checksum. This writer is the "fill real values"
// half of the cycle.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Write public/version.json for a finished, signed APK.
 *
 * @param {object} opts
 * @param {string} opts.root      frontend dir (version.json lands in root/public)
 * @param {string} opts.versionName  e.g. "1.1.4"
 * @param {number} opts.versionCode  Android versionCode
 * @param {string} opts.apkPath      path of the built signed APK (sha/size come from it)
 * @returns {{sha256: string, size: number}}
 */
export function writeVersionJson({ root, versionName, versionCode, apkPath }) {
  const apkBuf = readFileSync(apkPath);
  const sha256 = createHash('sha256').update(apkBuf).digest('hex');
  writeFileSync(
    resolve(root, 'public/version.json'),
    JSON.stringify(
      {
        version: versionName,
        versionCode,
        apkUrl: '/genz-whatsapp.apk',
        sha256,
        size: apkBuf.length,
        releasedAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n'
  );
  return { sha256, size: apkBuf.length };
}
