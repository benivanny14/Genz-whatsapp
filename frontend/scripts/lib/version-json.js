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
 * @param {string[]} [opts.changes]  changelog lines for this release. When
 *   omitted, any `changes` already present in the existing version.json are
 *   carried over (bump-app-version.js writes them first, this writer must not
 *   drop them when it fills in the real sha256/size).
 * @returns {{sha256: string, size: number}}
 */
export function writeVersionJson({ root, versionName, versionCode, apkPath, changes }) {
  const apkBuf = readFileSync(apkPath);
  const sha256 = createHash('sha256').update(apkBuf).digest('hex');

  // Preserve the changelog written by bump-app-version.js (or a previous
  // release's, if the bump didn't set one) so apk:build never wipes it.
  let previousChanges = [];
  try {
    const existing = JSON.parse(readFileSync(resolve(root, 'public/version.json'), 'utf8'));
    if (Array.isArray(existing?.changes)) previousChanges = existing.changes;
  } catch {
    /* no previous manifest — start with an empty changelog */
  }

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
        changes: Array.isArray(changes) ? changes : previousChanges,
      },
      null,
      2
    ) + '\n'
  );
  return { sha256, size: apkBuf.length };
}
