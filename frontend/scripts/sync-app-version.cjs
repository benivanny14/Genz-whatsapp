const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const versionFile = path.join(frontendRoot, 'config', 'app-version.json');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const bump = process.argv.includes('--bump');
const version = readJson(versionFile);
if (bump) {
  version.versionCode = Number(version.versionCode || 0) + 1;
  writeJson(versionFile, version);
}

const versionName = String(version.versionName || '1.0.0');
const versionCode = Number(version.versionCode || 1);

const packageJsonPath = path.join(frontendRoot, 'package.json');
const packageJson = readJson(packageJsonPath);
packageJson.version = versionName;
writeJson(packageJsonPath, packageJson);

const rootPackagePath = path.join(repoRoot, 'package.json');
if (fs.existsSync(rootPackagePath)) {
  const rootPackage = readJson(rootPackagePath);
  rootPackage.version = versionName;
  writeJson(rootPackagePath, rootPackage);
}

const capConfigPath = path.join(frontendRoot, 'capacitor.config.json');
if (fs.existsSync(capConfigPath)) {
  const capConfig = readJson(capConfigPath);
  capConfig.version = versionName;
  capConfig.ios = capConfig.ios || {};
  capConfig.android = capConfig.android || {};
  capConfig.ios.version = versionName;
  capConfig.android.version = versionName;
  capConfig.android.versionCode = versionCode;
  capConfig.ios.versionCode = String(versionCode);
  writeJson(capConfigPath, capConfig);
}

const gradlePath = path.join(frontendRoot, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  fs.writeFileSync(gradlePath, gradle);
}

const variablesPath = path.join(frontendRoot, 'android', 'variables.gradle');
if (fs.existsSync(variablesPath)) {
  let variables = fs.readFileSync(variablesPath, 'utf8');
  if (/versionCode\s*=/.test(variables)) {
    variables = variables.replace(/versionCode\s*=\s*\d+/, `versionCode = ${versionCode}`);
  }
  if (/versionName\s*=/.test(variables)) {
    variables = variables.replace(/versionName\s*=\s*['"][^'"]+['"]/, `versionName = '${versionName}'`);
  }
  fs.writeFileSync(variablesPath, variables);
}

const plistPath = path.join(frontendRoot, 'ios', 'App', 'App', 'Info.plist');
if (fs.existsSync(plistPath)) {
  let plist = fs.readFileSync(plistPath, 'utf8');
  if (plist.includes('<key>CFBundleShortVersionString</key>')) {
    plist = plist.replace(
      /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
      `$1${versionName}$2`
    );
  }
  if (plist.includes('<key>CFBundleVersion</key>')) {
    plist = plist.replace(
      /(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
      `$1${versionCode}$2`
    );
  }
  fs.writeFileSync(plistPath, plist);
}

const iosFallback = path.join(frontendRoot, 'ios-version.json');
writeJson(iosFallback, {
  versionName,
  versionCode,
  CFBundleShortVersionString: versionName,
  CFBundleVersion: String(versionCode)
});

module.exports = { versionName, versionCode };
