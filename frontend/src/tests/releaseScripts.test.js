import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke tests for the release scripts. These caught a real regression before:
// bump-app-version.js crashed at runtime (a removed import) mid-bump, leaving
// build.gradle half-incremented. Running the REAL script on throwaway copies
// (temp dir, never touching the repo) would have caught it instantly.
//
// The scripts compute their root from their own location
// (dirname(import.meta.url) → '..'), so copying them into
// <tmp>/scripts/… makes every read/write land inside the temp dir.

const frontendRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'genz-release-smoke-'));
  // Mirror the layout the scripts expect relative to their own location.
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'android', 'app'), { recursive: true });
  mkdirSync(join(dir, 'ios', 'App', 'App.xcodeproj'), { recursive: true });
  mkdirSync(join(dir, 'public'), { recursive: true });
  copyFileSync(join(frontendRoot, 'scripts', 'bump-app-version.js'), join(dir, 'scripts', 'bump-app-version.js'));
  copyFileSync(join(frontendRoot, 'android', 'app', 'build.gradle'), join(dir, 'android', 'app', 'build.gradle'));
  copyFileSync(
    join(frontendRoot, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
    join(dir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj')
  );
  copyFileSync(join(frontendRoot, 'public', 'version.json'), join(dir, 'public', 'version.json'));
  return dir;
}

test('bump-app-version.js runs end-to-end on throwaway copies (patch)', () => {
  const dir = makeTempRepo();
  try {
    const before = readFileSync(join(dir, 'android', 'app', 'build.gradle'), 'utf8');
    const beforeName = before.match(/versionName\s+"([^"]+)"/)?.[1];
    const beforeCode = Number(before.match(/versionCode\s+(\d+)/)?.[1]);
    const beforeJson = JSON.parse(readFileSync(join(dir, 'public', 'version.json'), 'utf8'));

    const result = spawnSync(process.execPath, ['scripts/bump-app-version.js', 'patch'], {
      cwd: dir,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `script failed:\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /\[bump\]/);

    // Android versionCode +1, versionName patch-bumped.
    const after = readFileSync(join(dir, 'android', 'app', 'build.gradle'), 'utf8');
    const afterName = after.match(/versionName\s+"([^"]+)"/)?.[1];
    const afterCode = Number(after.match(/versionCode\s+(\d+)/)?.[1]);
    assert.equal(afterCode, beforeCode + 1);
    const [bmaj, bmin, bpat] = beforeName.split('.').map(Number);
    assert.equal(afterName, `${bmaj}.${bmin}.${bpat + 1}`);

    // iOS build number +1 and MARKETING_VERSION aligned with Android.
    const pbx = readFileSync(join(dir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'), 'utf8');
    assert.equal(pbx.match(/CURRENT_PROJECT_VERSION = (\d+);/)?.[1], String(beforeCode + 1));
    assert.ok(pbx.includes(`MARKETING_VERSION = ${afterName};`));

    // version.json: new version/code, sha256/size explicitly null (never the
    // previous release's checksum).
    const json = JSON.parse(readFileSync(join(dir, 'public', 'version.json'), 'utf8'));
    assert.equal(json.version, afterName);
    assert.equal(json.versionCode, beforeCode + 1);
    assert.equal(json.sha256, null);
    assert.equal(json.size, null);
    assert.notEqual(json.version, beforeJson.version);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bump-app-version.js supports an explicit version and minor bumps', () => {
  const dir = makeTempRepo();
  try {
    const minor = spawnSync(process.execPath, ['scripts/bump-app-version.js', 'minor'], {
      cwd: dir,
      encoding: 'utf8'
    });
    assert.equal(minor.status, 0, minor.stderr);
    const gradleMinor = readFileSync(join(dir, 'android', 'app', 'build.gradle'), 'utf8');
    const nameMinor = gradleMinor.match(/versionName\s+"([^"]+)"/)?.[1];
    const codeMinor = Number(gradleMinor.match(/versionCode\s+(\d+)/)?.[1]);

    const explicit = spawnSync(process.execPath, ['scripts/bump-app-version.js', '2.5.0'], {
      cwd: dir,
      encoding: 'utf8'
    });
    assert.equal(explicit.status, 0, explicit.stderr);
    const gradleExplicit = readFileSync(join(dir, 'android', 'app', 'build.gradle'), 'utf8');
    assert.equal(gradleExplicit.match(/versionName\s+"([^"]+)"/)?.[1], '2.5.0');
    assert.equal(Number(gradleExplicit.match(/versionCode\s+(\d+)/)?.[1]), codeMinor + 1);
    assert.equal(nameMinor.split('.').length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeVersionJson fills the real sha256/size of the built APK', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'genz-writer-smoke-'));
  try {
    mkdirSync(join(dir, 'public'), { recursive: true });
    // A throwaway "APK": 1 MiB of deterministic bytes.
    const apkPath = join(dir, 'app-release.apk');
    const apkBuf = Buffer.alloc(1024 * 1024, 0x5a);
    writeFileSync(apkPath, apkBuf);
    const expectedSha = createHash('sha256').update(apkBuf).digest('hex');

    const { writeVersionJson } = await import('../../scripts/lib/version-json.js');
    const { sha256, size } = writeVersionJson({
      root: dir,
      versionName: '9.9.9',
      versionCode: 42,
      apkPath,
      downloadUrl: 'https://example.invalid/releases/download/v9.9.9/genz-whatsapp.apk'
    });

    assert.equal(sha256, expectedSha);
    assert.equal(size, apkBuf.length);
    const json = JSON.parse(readFileSync(join(dir, 'public', 'version.json'), 'utf8'));
    assert.equal(json.version, '9.9.9');
    assert.equal(json.versionCode, 42);
    assert.equal(json.sha256, expectedSha);
    assert.equal(json.size, apkBuf.length);
    assert.equal(json.downloadUrl, 'https://example.invalid/releases/download/v9.9.9/genz-whatsapp.apk');
    assert.ok(json.apkUrl === '/genz-whatsapp.apk');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release scripts parse cleanly (syntax check)', () => {
  for (const script of [
    'scripts/bump-app-version.js',
    'scripts/build-apk.js',
    'scripts/lib/version-json.js',
    '../scripts/release-engagement-check.js'
  ]) {
    const check = spawnSync(process.execPath, ['--check', join(frontendRoot, script)], { encoding: 'utf8' });
    assert.equal(check.status, 0, `${script} failed syntax check:\n${check.stderr}`);
  }
});

test('release-engagement-check compute detects a stale low-engagement release', async () => {
  const { compute } = await import('../../../scripts/release-engagement-check.js');
  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const releases = [
    { tag_name: 'v1.1.8', published_at: daysAgo(9) },
    { tag_name: 'v1.1.7', published_at: daysAgo(20) }
  ];

  // Live 9 days, nobody saw it, previous release had data → LOW.
  const low = compute({
    currentVersion: '1.1.8',
    releases,
    uptakes: { '1.1.8': { shown: 0, updated: 0 }, '1.1.7': { shown: 12, updated: 8 } }
  });
  assert.equal(low.lowEngagement, true);
  assert.equal(low.ageDays, 9);
  assert.equal(low.previousShown, 12);

  // Recent release → never flagged, whatever the counts.
  const recent = compute({
    currentVersion: '1.1.8',
    releases: [{ tag_name: 'v1.1.8', published_at: daysAgo(2) }, { tag_name: 'v1.1.7', published_at: daysAgo(20) }],
    uptakes: { '1.1.8': { shown: 0, updated: 0 }, '1.1.7': { shown: 12, updated: 8 } }
  });
  assert.equal(recent.lowEngagement, false);

  // Old release but NO opt-in baseline on the previous release → not flagged
  // (opt-in analytics are new; near-zero counts are expected until adoption).
  const noBaseline = compute({
    currentVersion: '1.1.8',
    releases,
    uptakes: { '1.1.8': { shown: 0, updated: 0 }, '1.1.7': { shown: 0, updated: 0 } }
  });
  assert.equal(noBaseline.lowEngagement, false);

  // Old release with real engagement → fine.
  const engaged = compute({
    currentVersion: '1.1.8',
    releases,
    uptakes: { '1.1.8': { shown: 9, updated: 6 }, '1.1.7': { shown: 12, updated: 8 } }
  });
  assert.equal(engaged.lowEngagement, false);
});
