import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards for the release-APK pipeline. Both of these caught real breakage:
//
//  * A release APK shipped with `VITE_API_URL=http://10.0.2.2:5000` baked in
//    (leaked from a gitignored frontend/.env.local). 10.0.2.2 is the Android
//    emulator's alias for the developer machine, so the app could not reach the
//    API on a physical phone at all. resolveApiBase() only falls back to the
//    production backend when VITE_API_URL is *empty*, so nothing warned.
//  * The same APK bundled a stale copy of the download APK (11 MB) inside
//    itself because `cap sync` does not prune files removed from dist.
//
// These tests run the REAL verifier script against throwaway bundles in a temp
// dir, so a regression fails here instead of shipping.

const frontendRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const verifier = join(frontendRoot, 'scripts', 'verify-bundle-env.js');

const runVerifier = (args) =>
  spawnSync(process.execPath, [verifier, ...args], { encoding: 'utf8' });

/** Build a fake bundle: <dir>/assets/<name>.js with the given contents. */
function makeBundle(chunks, { extraFiles = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'genz-bundle-'));
  mkdirSync(join(dir, 'assets'), { recursive: true });
  for (const [name, body] of Object.entries(chunks)) {
    writeFileSync(join(dir, 'assets', name), body);
  }
  for (const [relPath, body] of extraFiles) {
    const full = join(dir, relPath);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

const PROD_ORIGIN = 'https://genz-whatsapp.onrender.com/api';
// Shaped like the real minified output: Vite bakes the whole import.meta.env
// object in as plain properties with backtick string literals.
const envChunk = (apiUrl, socketUrl = '') =>
  `const e={BASE_URL:\`/\`,MODE:\`production\`,VITE_API_URL:\`${apiUrl}\`` +
  (socketUrl ? `,VITE_SOCKET_URL:\`${socketUrl}\`` : '') +
  '};';
const prodChunk = envChunk(PROD_ORIGIN, 'https://genz-whatsapp.onrender.com');

test('verify-bundle-env.js accepts a bundle with the production API origin', () => {
  const dir = makeBundle({ 'index-abc.js': prodChunk });
  try {
    const res = runVerifier(['--target', dir, '--expect', PROD_ORIGIN]);
    assert.equal(res.status, 0, res.stdout + res.stderr);
    assert.match(res.stdout, /✅ OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify-bundle-env.js rejects the emulator origin that really shipped', () => {
  // This is the exact value that reached a release APK via frontend/.env.local.
  const dir = makeBundle({
    'index-abc.js': envChunk('http://10.0.2.2:5000', 'http://10.0.2.2:5000'),
  });
  try {
    const res = runVerifier(['--target', dir]);
    assert.equal(res.status, 1, 'a 10.0.2.2 origin must fail the build');
    assert.match(res.stderr, /10\.0\.2\.2:5000/);
    assert.match(res.stderr, /real device/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify-bundle-env.js rejects localhost/LAN bundles too', () => {
  const locals = [
    'http://localhost:5000',
    'http://localhost:5000/api',
    'http://127.0.0.1:5000',
    'http://192.168.1.20:5000',
    'http://[::1]:5000',
  ];
  for (const origin of locals) {
    const dir = makeBundle({ 'index-abc.js': envChunk('', origin) });
    try {
      assert.equal(runVerifier(['--target', dir]).status, 1, `${origin} must fail the build`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('verify-bundle-env.js ignores localhost strings inside vendor libraries', () => {
  // react-dom ships `let r=\`http://localhost\`` as its own fallback and
  // workbox derives a base href from window.location — a naive host scan
  // rejected a good build because of them. Only the inlined import.meta.env
  // values may be judged.
  const dir = makeBundle({
    'index-abc.js': prodChunk,
    'vendor-react.js': 'function ie(e,t,n=!1){let r=`http://localhost`;e&&(r=e.location.origin===`null`?e.loc:r)}',
    'vendor.js': 'Wn=Bn&&window.location.href||`http://localhost`',
  });
  try {
    const res = runVerifier(['--target', dir, '--expect', PROD_ORIGIN]);
    assert.equal(res.status, 0, res.stdout + res.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify-bundle-env.js fails a bundle with no inlined API URL at all', () => {
  const dir = makeBundle({ 'index-abc.js': 'const x=1;' });
  try {
    const res = runVerifier(['--target', dir]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /No VITE_API_URL/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify-bundle-env.js fails when the expected origin is absent', () => {
  const dir = makeBundle({ 'index-abc.js': envChunk('https://staging.example.com/api') });
  try {
    const res = runVerifier(['--target', dir, '--expect', PROD_ORIGIN]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /was NOT baked/);
    assert.match(res.stderr, /staging\.example\.com/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify-bundle-env.js rejects a bundled .apk in --no-apk mode', () => {
  const apkBytes = Buffer.alloc(1024, 7);
  const dir = makeBundle(
    { 'index-abc.js': prodChunk },
    { extraFiles: [['genz-whatsapp.apk', apkBytes]] }
  );
  try {
    assert.equal(runVerifier(['--target', dir, '--expect', PROD_ORIGIN, '--no-apk']).status, 1);
    // ...but the same bundle is fine for the web deploy, which serves it.
    assert.equal(runVerifier(['--target', dir, '--expect', PROD_ORIGIN, '--allow-apk']).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('build-apk.js verifies the baked origin and prunes APKs from native assets', () => {
  const src = readFileSync(join(frontendRoot, 'scripts', 'build-apk.js'), 'utf8');
  // Must verify what the bundle actually baked, not just the env it passed.
  assert.match(src, /verify-bundle-env\.js --target dist --expect/);
  assert.match(src, /verify-bundle-env\.js --target android\/app\/src\/main\/assets\/public --expect/);
  // Must delete stale APKs left behind by cap sync (which never prunes).
  assert.match(src, /Pruning stray \.apk files from native assets/);
  assert.match(src, /genz-whatsapp\.apk/);
  // The verified target must be the dir Gradle actually zips.
  assert.match(src, /app\/src\/main\/assets\/public/);
});

test('AndroidManifest does not allow cleartext to every host', () => {
  const manifest = readFileSync(
    join(frontendRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    'utf8'
  );
  assert.doesNotMatch(
    manifest,
    /usesCleartextTraffic="true"/,
    'global cleartext traffic must stay off in the shipped app'
  );
  assert.match(manifest, /android:networkSecurityConfig="@xml\/network_security_config"/);

  const nsc = readFileSync(
    join(frontendRoot, 'android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml'),
    'utf8'
  );
  assert.match(nsc, /<base-config cleartextTrafficPermitted="false"/);
  for (const host of ['localhost', '127.0.0.1', '10.0.2.2']) {
    assert.match(nsc, new RegExp(`>${host.replace(/\./g, '\\.')}<`));
  }
});

test('production env files cannot leak a dev API URL into a build', () => {
  // `.env.local` is loaded in EVERY Vite mode (including production builds),
  // which is exactly how 10.0.2.2 reached a release APK. Dev overrides must
  // live in `.env.development.local`, and .env.example must say so.
  const example = readFileSync(join(frontendRoot, '.env.example'), 'utf8');
  assert.match(example, /\.env\.development\.local/);
});
