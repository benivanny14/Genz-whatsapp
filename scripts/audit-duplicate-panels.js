// Audit: find pairs of components that call the SAME backend API endpoints
// (strong duplicate signal), and report which are actually imported/used.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'frontend', 'src');
const allFiles = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
    else if (e.name.endsWith('.jsx') || e.name.endsWith('.js')) allFiles.push(p);
  }
}
walk(srcDir);

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

function apiCalls(code) {
  const calls = new Set();
  // Extract any quoted/backtick string containing a slash (URL-ish), plus
  // the URL passed to fetch/authFetch/api.get/api.post nearby.
  const re = /(['"`])([^'"`]*\/[^'"`]*)\1/g;
  let m;
  while ((m = re.exec(code))) {
    const p = m[2].trim();
    if (p.length < 3) continue;
    if (/\s/.test(p)) continue;
    // normalize ${...} interpolations
    const norm = p.replace(/\$\{[^}]+\}/g, '{}').replace(/^https?:\/\/[^/]+/, '');
    if (norm.startsWith('/') || norm.includes('/')) calls.add(norm);
  }
  return [...calls];
}

function importedBy(name) {
  const base = path.basename(name).replace(/\.(jsx|js)$/, '');
  const hits = [];
  for (const p of allFiles) {
    if (p.endsWith('/' + name)) continue;
    const c = read(p);
    if (new RegExp(`import[^;]*['"][^'"]*${base}['"]`).test(c) || new RegExp(`import\\s*\\([^)]*['"][^'"]*${base}['"]`).test(c)) {
      hits.push(p.replace(srcDir + path.sep, ''));
    }
  }
  return hits;
}

const files = allFiles.filter(p => p.includes(path.sep + 'components' + path.sep)).map(p => p.replace(srcDir + path.sep, ''));
const data = files.map(f => ({ f, api: apiCalls(read(path.join(srcDir, f))), imports: importedBy(f) }));

console.log('=== FILES WITH SAME API ENDPOINTS (duplicate signals) ===');
const byApi = new Map();
for (const d of data) {
  for (const a of d.api) {
    if (!byApi.has(a)) byApi.set(a, []);
    byApi.get(a).push(d.f);
  }
}
for (const [api, filesList] of [...byApi.entries()].sort()) {
  if (filesList.length > 1) {
    console.log(`\n[${api}] -> ${filesList.join(', ')}`);
  }
}

console.log('\n\n=== SUSPECT PAIRS (name-similar) with usage ===');
const pairs = [
  ['CrossPlatformSharing', 'CrossPlatformSharingPanel'],
  ['PaymentFeatures', 'PaymentFeaturesManager'],
  ['VoiceChangerPanel', 'VoiceFeaturesPanel'],
  ['BiometricAuth', 'BiometricLock'],
  ['AccessibilityAdvancedPanel', 'AccessibilityPanel'],
  ['InviteLinks', 'GroupInviteLink'],
  ['ViewOnceMedia', 'ViewOnceMessage'],
  ['Language', 'LanguageSelector'],
  ['DataSaver', 'DataUsage', 'DownloadQuality'],
  ['ContactManagement', 'ContactManager', 'ContactsPanel'],
  ['DeviceLinking', 'DeviceManagement'],
  ['MuteNotifications', 'NotificationSettings'],
  ['BlockUnblock', 'BlockedContacts'],
  ['ChatTheme', 'WallpaperSelector', 'ChatWallpaper'],
  ['StorageManagement', 'DataUsage'],
  ['QuickReplies', 'TextToSpeechPanel'],
  ['MessageReactions', 'LiveReactions'],
  ['TwoFactorAuth', 'PasskeysSettings'],
  ['BusinessAccountPanel', 'BusinessProfileManager'],
  ['GroupAdmin', 'GroupManagement', 'GroupMemberManagement'],
  ['ForwardDialog', 'MessageForwarding'],
  ['ReplyMessage', 'MessageQuoting', 'MessageGroupReply'],
  ['SpamFilter', 'BlockUnknown', 'MuteUnknown'],
  ['SecureBackup', 'StatusBackupPanel'],
  ['PrivacyCheckup', 'AccountPrivacy', 'PrivacyModsPanel'],
  ['HiddenChats', 'ChatLock', 'SecretChat'],
  ['Archived', 'ArchiveChats'],
];
for (const group of pairs) {
  const rows = group.map(n => {
    const file = files.find(f => path.basename(f).replace(/\.(jsx|js)$/, '') === n);
    if (!file) return null;
    const d = data.find(x => x.f === file);
    return { n, api: d.api.join(', '), imported: d.imports.length ? d.imports.join(', ') : 'NOT USED (dead?)' };
  }).filter(Boolean);
  console.log(`\n--- ${group.join(' vs ')} ---`);
  for (const r of rows) console.log(`  ${r.n}: api=[${r.api}] imported_by=[${r.imported}]`);
}
