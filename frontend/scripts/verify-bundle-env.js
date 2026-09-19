#!/usr/bin/env node
/**
 * verify-bundle-env.js — asserts what a finished web/APK bundle actually baked
 * in, instead of trusting the env vars that were *supposed* to be applied.
 *
 * Why this exists: `resolveApiBase()` prefers VITE_API_URL and only falls back
 * to the production backend when it is EMPTY. A stray `.env.local` containing
 * an emulator address (http://10.0.2.2:5000) therefore won the race and got
 * baked into a release APK — an APK that cannot reach the API on a real phone.
 * pre-build-check.js only inspects the environment; this script inspects the
 * BUILT ARTIFACT.
 *
 * Usage:
 *   node scripts/verify-bundle-env.js                       # scan dist/ for a
 *                                                           # local URL leak
 *   node scripts/verify-bundle-env.js --target dist
 *   node scripts/verify-bundle-env.js --target android/app/src/main/assets/public
 *   node scripts/verify-bundle-env.js --expect https://genz-whatsapp.onrender.com/api
 *   node scripts/verify-bundle-env.js --no-apk              # APK-in-bundle must NOT exist
 *
 * Exit code 1 on any violation. Warnings never fail.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const target = argValue('--target', 'dist');
const expect = argValue('--expect', null);
// `--no-apk` (default in apk builds) means an .apk file inside the bundle is a
// failure. Passing `--allow-apk` is for the web deploy, where the download APK
// legitimately lives in dist/.
const allowApk = args.includes('--allow-apk') || !args.includes('--no-apk');

const targetDir = resolve(root, target);

let failed = false;
const fail = (msg) => { console.error(`❌ ${msg}`); failed = true; };

if (!existsSync(targetDir)) {
  console.error(`❌ ${target} does not exist — run the build first.`);
  process.exit(1);
}

// ── 1. Collect the JS chunks that make up the app ────────────────────────
const jsFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(full);
  }
};
const assetsDir = join(targetDir, 'assets');
if (existsSync(assetsDir)) walk(assetsDir);
if (jsFiles.length === 0) {
  // Some builds keep JS at the root (e.g. a hand-copied assets dir).
  for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(join(targetDir, entry.name));
  }
}

if (jsFiles.length === 0) {
  fail(`${target} has no JS assets to inspect — did the build produce anything?`);
  console.log(failed ? '\n[verify-bundle] ❌ FAILED' : '\n[verify-bundle] ✅ OK');
  process.exit(failed ? 1 : 0);
}

// ── 2. Local/emulator API origins are never valid in a shipped bundle ────
// 10.0.2.2 is the Android emulator's alias for the developer machine and is
// unreachable from a physical device; localhost/127.0.0.1 resolves to the phone
// itself; a 192.168.x.x address only exists on the developer's LAN.
const isLocalOrigin = (url) =>
  /^https?:\/\/10\.0\.2\.2(?::\d+)?(?:\/|$)/.test(url) ||
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/.test(url) ||
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?(?:\/|$)/.test(url) ||
  /^https?:\/\/\[::1\](?::\d+)?(?:\/|$)/.test(url);

// Only the inlined `import.meta.env` values matter — Vite bakes them in as
// `VITE_API_URL:`…`` (or with plain quotes when the value survives that way).
// Scanning for a bare "http://localhost" anywhere in the bundle produces false
// positives: vendor libraries ship such strings as their own fallbacks
// (react-dom's `e.location.origin==='null'` path, workbox's base href), which
// is why a naive host scan rejected a perfectly good build.
const INLINED_ENV_RE = /VITE_(API|SOCKET)_URL\s*:\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g;

const leaked = new Map();
const seen = new Map();
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  INLINED_ENV_RE.lastIndex = 0;
  for (const match of source.matchAll(INLINED_ENV_RE)) {
    const value = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (!value) continue;
    const key = `VITE_${match[1]}_URL`;
    if (!seen.has(value)) seen.set(value, new Set());
    seen.get(value).add(key);
    if (isLocalOrigin(value)) {
      if (!leaked.has(value)) leaked.set(value, []);
      leaked.get(value).push(`${file.replace(root, '.')} (${key})`);
    }
  }
}

if (seen.size === 0) {
  fail(`No VITE_API_URL/VITE_SOCKET_URL value is inlined in ${target} — the bundle cannot know which backend to use.`);
}

if (leaked.size > 0) {
  for (const [url, files] of leaked) {
    fail(`Baked local/emulator API origin "${url}" in ${files.length} chunk(s): ${files.slice(0, 3).join(', ')}`);
  }
  console.error('   A bundle with a localhost/emulator origin cannot reach the API on a real device (or on the deployed site).');
  console.error('   Fix: keep machine-local values in frontend/.env.development.local — Vite loads frontend/.env.local in EVERY mode, including production builds.');
}

if (expect) {
  const wanted = expect.replace(/\/$/, '');
  const found = [...seen.keys()].some((v) => v.replace(/\/$/, '') === wanted);
  if (!found) {
    fail(
      `Expected API origin "${expect}" was NOT baked into any chunk in ${target} ` +
      `(inlined values: ${[...seen.keys()].map((v) => `"${v}"`).join(', ')}).`
    );
  }
}

// ── 3. The download APK must not be bundled inside the app ───────────────
const embeddedApks = [];
const findApks = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findApks(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.apk')) embeddedApks.push(full);
  }
};
findApks(targetDir);

if (embeddedApks.length > 0) {
  const total = embeddedApks.reduce((sum, f) => sum + statSync(f).size, 0);
  const detail = embeddedApks.map((f) => f.replace(root, '.')).join(', ');
  const mb = (total / 1024 / 1024).toFixed(1);
  if (allowApk) {
    console.warn(`⚠️  Bundle contains ${embeddedApks.length} .apk file(s) (${mb} MB): ${detail}`);
    console.warn('   Fine for the web deploy, but `cap sync` would copy it INTO the app — apk:build strips it.');
  } else {
    fail(`APK build bundle contains ${embeddedApks.length} .apk file(s) (${mb} MB): ${detail}`);
    console.error('   The download APK must never be shipped inside the app — it inflates the APK by its own size.');
  }
}

console.log(
  `[verify-bundle] ${jsFiles.length} chunk(s) scanned in ${target}` +
  ` — inlined: ${[...seen.entries()].map(([value, keys]) => `${[...keys].join('/')}="${value}"`).join(', ') || '(none)'}`
);
console.log(failed ? '[verify-bundle] ❌ FAILED' : '[verify-bundle] ✅ OK');
process.exit(failed ? 1 : 0);
