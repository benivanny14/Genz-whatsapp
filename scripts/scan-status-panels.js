/**
 * Heuristic audit of the Status page's panel components.
 * For each panel component used in Status.jsx, count signals of real work
 * (fetch / API calls / socket emits / window.open / downloads) versus
 * decoration-only behavior (console.log callbacks, localStorage writes,
 * pure state toggles).
 *
 * Usage: node scripts/scan-status-panels.js
 */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../frontend/src');
const statusCode = fs.readFileSync(path.join(src, 'pages/Status.jsx'), 'utf8');

// Extract all component names referenced as <Xxx ... /> in Status.jsx
const compNames = new Set();
const re = /<([A-Z][A-Za-z0-9]*)\b/g;
let m;
while ((m = re.exec(statusCode))) compNames.add(m[1]);

const imported = new Map();
const impRe = /import\s+([A-Z][A-Za-z0-9]*)\s+from\s+['"]([^'"]+)['"]/g;
while ((m = impRe.exec(statusCode))) imported.set(m[1], m[2]);

const components = {};
for (const name of compNames) {
  const imp = imported.get(name);
  if (!imp) continue;
  if (imp.startsWith('../components/')) {
    let file = path.join(src, imp.replace('../', ''));
    if (!file.endsWith('.jsx') && !file.endsWith('.js')) file += '.jsx';
    if (fs.existsSync(file)) components[name] = file;
  }
}

const analyze = (file) => {
  const code = fs.readFileSync(file, 'utf8');
  const signals = {
    fetchApi: (code.match(/fetch\(/g) || []).length,
    axios: (code.match(/axios/g) || []).length,
    authFetch: (code.match(/authFetch/g) || []).length,
    socketEmit: (code.match(/\.emit\(/g) || []).length,
    windowOpen: (code.match(/window\.open/g) || []).length,
    download: (code.match(/download|createObjectURL|toBlob|saveAs/g) || []).length,
    localWrite: (code.match(/localStorage\.setItem/g) || []).length,
    localRead: (code.match(/localStorage\.getItem/g) || []).length,
    navigatorShare: (code.match(/navigator\.share/g) || []).length,
    clipboard: (code.match(/clipboard/g) || []).length,
    consoleLog: (code.match(/console\.log/g) || []).length,
    toast: (code.match(/toast\./g) || []).length,
    audioVideo: (code.match(/new Audio|new Howl|play\(/g) || []).length,
    onXCallback: (code.match(/on[A-Z][A-Za-z]*\s*=/g) || []).length,
  };
  const realWork =
    signals.fetchApi + signals.axios + signals.authFetch + signals.socketEmit +
    signals.windowOpen + signals.download + signals.navigatorShare + signals.clipboard +
    signals.audioVideo;
  return { signals, realWork };
};

const rows = [];
for (const [name, file] of Object.entries(components)) {
  if (!fs.existsSync(file)) continue;
  const { signals, realWork } = analyze(file);
  rows.push({ name, file: path.relative(src, file), realWork, signals });
}

rows.sort((a, b) => a.realWork - b.realWork);

console.log('=== Panels with LITTLE/NO real work (suspect decoration) ===');
for (const r of rows.filter((r) => r.realWork === 0)) {
  console.log(`  ${r.name.padEnd(28)} ${r.file}`);
  console.log(`      fetch:${r.signals.fetchApi} emit:${r.signals.socketEmit} open:${r.signals.windowOpen} dl:${r.signals.download} lsW:${r.signals.localWrite} lsR:${r.signals.localRead} share:${r.signals.navigatorShare} cb:${r.signals.consoleLog}`);
}
console.log('\n=== Low real work (<=3 signals) with evidence lines ===');
const evidenceRe = /fetch\(|authFetch|axios|socket|window\.open|navigator\.share|clipboard|createObjectURL|toBlob|saveAs|speechSynthesis|\.emit\(/;
for (const r of rows.filter((r) => r.realWork > 0 && r.realWork <= 3)) {
  const code = fs.readFileSync(path.join(src, r.file), 'utf8');
  const lines = code.split(/\r?\n/);
  const hits = lines.map((l, i) => ({ l, i })).filter((x) => evidenceRe.test(x.l)).slice(0, 4);
  console.log(`  ${r.name.padEnd(26)} ${r.file}  (real=${r.realWork})`);
  for (const h of hits) console.log(`      ${String(h.i + 1).padEnd(4)} ${h.l.trim().slice(0, 110)}`);
}
console.log('\n=== Panels with real work (>3) ===');
for (const r of rows.filter((r) => r.realWork > 3)) {
  console.log(`  ${r.name.padEnd(28)} ${r.file}  (real=${r.realWork})`);
}
console.log(`\nTotal panels analyzed: ${rows.length}`);
