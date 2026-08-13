/**
 * create-github-release.js — publish the current APK as a GitHub Release.
 *
 * GENZ is distributed as a direct-download APK (no Play Store), so every
 * release should also be downloadable from GitHub — a backup channel users
 * can trust. This script:
 *
 *   1. reads frontend/public/version.json (version, versionCode, sha256, size)
 *   2. extracts the newest entry from CHANGELOG.md as release notes
 *   3. creates (or updates) a GitHub release tagged v{version}
 *   4. uploads frontend/public/genz-whatsapp.apk as a release asset
 *
 * Usage (from repo root):
 *   node scripts/create-github-release.js [--repo owner/repo] [--dry-run]
 *
 * Token: GITHUB_TOKEN env (CI) or the git credential helper (local) — the
 * same mechanism set-render-github-secrets.js uses. The token needs `repo`
 * scope to create releases.
 */
const { execSync } = require('child_process');
const { readFileSync, statSync } = require('fs');
const { resolve } = require('path');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const REPO = getArg('--repo') || 'benivanny14/Genz-whatsapp';
const DRY_RUN = args.includes('--dry-run');

const versionJson = JSON.parse(readFileSync(resolve(__dirname, '../frontend/public/version.json'), 'utf8'));
const apkPath = resolve(__dirname, '../frontend/public/genz-whatsapp.apk');
const changelog = readFileSync(resolve(__dirname, '../CHANGELOG.md'), 'utf8');

const version = versionJson.version;
const tag = `v${version}`;

// Newest changelog entry: from the first "## [" heading to the next "---".
const firstMatch = changelog.match(/## \[[^\]]+\] — .*?(?=\n---|\n## \[)/s);
const notes = firstMatch ? firstMatch[0].trim() : `Release ${tag}`;

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    const m = out.match(/^password=(.*)$/m);
    if (m) return m[1].trim();
  } catch { /* fall through */ }
  throw new Error('No GitHub token: set GITHUB_TOKEN or configure the git credential helper.');
}

async function main() {
  const token = getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
  const api = `https://api.github.com/repos/${REPO}`;

  console.log(`[release] ${REPO} → ${tag} (${versionJson.versionCode}, apk ${(statSync(apkPath).size / 1048576).toFixed(1)} MB)`);

  if (DRY_RUN) {
    console.log('[release] DRY-RUN — would create/update release:');
    console.log(`  tag:    ${tag}`);
    console.log(`  notes:  ${notes.split('\n')[0]}… (${notes.length} chars)`);
    console.log(`  asset:  ${apkPath}`);
    return;
  }

  // Does the release already exist? (re-run / patch scenario)
  const existingRes = await fetch(`${api}/releases/tags/${tag}`, { headers });
  let releaseId = null;
  if (existingRes.status === 200) {
    const existing = await existingRes.json();
    releaseId = existing.id;
    console.log(`[release] release ${tag} exists (id ${releaseId}) — updating`);
  }

  const body = JSON.stringify({
    tag_name: tag,
    name: `GENZ WhatsApp ${tag}`,
    body: `${notes}\n\n---\n**APK**: download from the login page or attach \`genz-whatsapp.apk\` below. SHA-256: \`${versionJson.sha256 || 'n/a'}\``,
    draft: false,
    prerelease: false
  });

  let releaseUrl;
  if (releaseId) {
    const res = await fetch(`${api}/releases/${releaseId}`, { method: 'PATCH', headers, body });
    if (!res.ok) throw new Error(`Update release failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    releaseUrl = (await res.json()).html_url;
  } else {
    const res = await fetch(`${api}/releases`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`Create release failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const created = await res.json();
    releaseId = created.id;
    releaseUrl = created.html_url;
  }
  console.log(`[release] release ready → ${releaseUrl}`);

  // Replace an existing APK asset so the script is idempotent (re-running
  // after a rebuild must swap the file, not fail with a name collision).
  const assetsRes = await fetch(`${api}/releases/${releaseId}/assets`, { headers });
  if (assetsRes.ok) {
    const assets = await assetsRes.json();
    for (const asset of assets) {
      if (asset.name === 'genz-whatsapp.apk') {
        const del = await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
        });
        if (del.status !== 204 && del.status !== 404) {
          throw new Error(`Asset delete failed (${del.status})`);
        }
        console.log(`[release] replaced previous APK asset (${asset.id})`);
      }
    }
  }

  // Upload the APK as a release asset (uploads host, no Content-Type in auth header).
  const apkBuf = readFileSync(apkPath);
  const uploadRes = await fetch(
    `https://uploads.github.com/repos/${REPO}/releases/${releaseId}/assets?name=genz-whatsapp.apk`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/vnd.android.package-archive'
      },
      body: apkBuf
    }
  );
  if (!uploadRes.ok) {
    throw new Error(`Asset upload failed (${uploadRes.status}): ${(await uploadRes.text()).slice(0, 200)}`);
  }
  const asset = await uploadRes.json();
  console.log(`[release] APK uploaded → ${asset.browser_download_url}`);
  console.log(`[release] done ✓`);
}

main().catch((err) => {
  console.error(`[release] FAILED: ${err.message}`);
  process.exit(1);
});
