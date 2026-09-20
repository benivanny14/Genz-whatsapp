const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const frontendRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(frontendRoot, 'android');
const isWin = process.platform === 'win32';

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || frontendRoot,
    stdio: 'inherit',
    shell: isWin,
    env: { ...process.env, ...(options.env || {}) }
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`);
  }
};

const fileExists = (filePath) => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const sha256File = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

const copyFile = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

const filesEqual = (a, b) => fileExists(a) && fileExists(b) && sha256File(a) === sha256File(b);

const gradleCmd = isWin ? 'gradlew.bat' : './gradlew';

run(process.execPath, [path.join(__dirname, 'sync-app-version.cjs'), '--bump'], { cwd: frontendRoot });
delete require.cache[require.resolve('./sync-app-version.cjs')];
const { versionName, versionCode } = require('./sync-app-version.cjs');

const keystorePath = process.env.KEYSTORE_PATH
  || process.env.ANDROID_KEYSTORE_PATH
  || path.join(androidRoot, 'keystore', 'release.jks');

if (!fileExists(keystorePath)) {
  throw new Error(`Release keystore not found at ${keystorePath}. Set KEYSTORE_PATH. Debug signing is not allowed.`);
}
if (!process.env.KEYSTORE_PASSWORD || !process.env.KEY_ALIAS || !process.env.KEY_PASSWORD) {
  throw new Error('KEYSTORE_PASSWORD, KEY_ALIAS, and KEY_PASSWORD must be set. Do not commit passwords.');
}

run('npm', ['run', 'build'], {
  cwd: frontendRoot,
  env: {
    VITE_APP_VERSION: String(versionName),
    VITE_APP_VERSION_CODE: String(versionCode)
  }
});

if (!fs.existsSync(path.join(androidRoot, 'gradlew')) && !fs.existsSync(path.join(androidRoot, 'gradlew.bat'))) {
  run('npx', ['cap', 'add', 'android'], { cwd: frontendRoot });
}

run('npx', ['cap', 'sync', 'android'], { cwd: frontendRoot });
run(process.execPath, [path.join(__dirname, 'patch-android-native.cjs')], { cwd: frontendRoot });
run(process.execPath, [path.join(__dirname, 'sync-app-version.cjs')], { cwd: frontendRoot });

run(gradleCmd, ['assembleRelease', '--stacktrace'], {
  cwd: androidRoot,
  env: {
    KEYSTORE_PATH: keystorePath,
    KEYSTORE_PASSWORD: process.env.KEYSTORE_PASSWORD,
    KEY_ALIAS: process.env.KEY_ALIAS,
    KEY_PASSWORD: process.env.KEY_PASSWORD
  }
});

const apkDir = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'release');
const generatedApk = ['app-release.apk', 'app-release-unsigned.apk']
  .map((name) => path.join(apkDir, name))
  .find(fileExists);

if (!generatedApk) {
  throw new Error(`Release APK not found in ${apkDir}`);
}
if (generatedApk.endsWith('unsigned.apk')) {
  throw new Error('assembleRelease produced an unsigned APK. Fix release signing before continuing.');
}

const canonical = path.join(frontendRoot, 'public', 'downloads', 'genz-whatsapp.apk');
const legacy = path.join(frontendRoot, 'public', 'downloads', 'genz-whatsapp-latest.apk');
const distCanonical = path.join(frontendRoot, 'dist', 'downloads', 'genz-whatsapp.apk');
const distLegacy = path.join(frontendRoot, 'dist', 'downloads', 'genz-whatsapp-latest.apk');
const backendCanonical = path.join(frontendRoot, '..', 'backend', 'downloads', 'genz-whatsapp.apk');
const backendLegacy = path.join(frontendRoot, '..', 'backend', 'downloads', 'genz-whatsapp-latest.apk');

[canonical, legacy, distCanonical, distLegacy, backendCanonical, backendLegacy].forEach((target) => copyFile(generatedApk, target));

const digest = sha256File(canonical);
const size = fs.statSync(canonical).size;

for (const copy of [legacy, distCanonical, distLegacy, backendCanonical, backendLegacy, generatedApk]) {
  if (!filesEqual(canonical, copy)) throw new Error(`APK copy mismatch: ${copy}`);
  if (fs.statSync(copy).size !== size) throw new Error(`APK size mismatch: ${copy}`);
}

const versionPayload = {
  versionName,
  version: versionName,
  versionCode,
  sha256: digest,
  size,
  apkUrl: '/downloads/genz-whatsapp.apk',
  buildDate: new Date().toISOString()
};

const versionTargets = [
  path.join(frontendRoot, 'public', 'downloads', 'version.json'),
  path.join(frontendRoot, 'dist', 'downloads', 'version.json'),
  path.join(frontendRoot, '..', 'backend', 'downloads', 'version.json')
];
versionTargets.forEach((target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(versionPayload, null, 2)}\n`);
});

for (const payload of versionTargets.map((target) => JSON.parse(fs.readFileSync(target, 'utf8')))) {
  if (Number(payload.versionCode) !== Number(versionCode)) {
    throw new Error('versionCode mismatch between configs and version.json');
  }
  if (payload.sha256 !== digest) {
    throw new Error('SHA256 mismatch between version.json and signed APK');
  }
  if (Number(payload.size) !== Number(size)) {
    throw new Error('size mismatch between version.json and signed APK');
  }
}

let verified = false;
const tryApksigner = (bin) => {
  const result = spawnSync(bin, ['verify', '--verbose', '--print-certs', canonical], { encoding: 'utf8', shell: isWin });
  if (result.status === 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (!/Verified using v1 scheme \(JAR signing\):\s*true/i.test(result.stdout || '') ||
        !/Verified using v2 scheme \(APK Signature Scheme v2\):\s*true/i.test(result.stdout || '')) {
      throw new Error('APK is signed but V1/V2 verification did not both report true.');
    }
    verified = true;
  }
};

if (process.env.APKSIGNER_PATH) tryApksigner(process.env.APKSIGNER_PATH);
if (!verified && process.env.ANDROID_HOME) {
  const buildTools = path.join(process.env.ANDROID_HOME, 'build-tools');
  if (fs.existsSync(buildTools)) {
    const versions = fs.readdirSync(buildTools).sort().reverse();
    for (const version of versions) {
      const bin = path.join(buildTools, version, isWin ? 'apksigner.bat' : 'apksigner');
      if (fileExists(bin)) {
        tryApksigner(bin);
        if (verified) break;
      }
    }
  }
}

if (!verified) {
  throw new Error('apksigner verify failed or apksigner was not found. Signing must be verified before publishing.');
}

console.log(JSON.stringify({
  versionName,
  versionCode,
  size,
  sha256: digest,
  apk: canonical
}, null, 2));
