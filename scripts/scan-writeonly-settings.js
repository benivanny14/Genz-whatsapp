/**
 * Scan backend User model settings fields and classify each as CONSUMED
 * (referenced outside its own settings controller — i.e. some behavior
 * reads it) or WRITE-ONLY (only its own controller/routes/model mention it —
 * toggles save but nothing acts on them).
 *
 * Usage: node scripts/scan-writeonly-settings.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../backend');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'tests' || entry.name === 'scripts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.js$/.test(entry.name)) files.push(full);
  }
})(root);

const modelCode = fs.readFileSync(path.join(root, 'models/User.js'), 'utf8');
const fields = [...modelCode.matchAll(/^  ([a-zA-Z]+Settings): /gm)].map((m) => m[1]).sort();

const results = [];
for (const field of fields) {
  const hits = [];
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    // count occurrences of the field name (word boundary)
    const re = new RegExp(`\\b${field}\\b`, 'g');
    let n = 0;
    let m;
    while ((m = re.exec(code))) n++;
    if (n > 0) hits.push({ file: path.relative(root, file).replace(/\\/g, '/'), count: n });
  }
  // Files OUTSIDE the field's own controller (a controller whose filename
  // contains the field's stem) count as "consumed".
  const stem = field.replace(/Settings$/, '');
  const ownFiles = hits.filter((h) => {
    const base = path.basename(h.file);
    return base.toLowerCase().includes(stem.toLowerCase()) || base === 'User.js' || base.includes('routes');
  });
  const external = hits.filter((h) => !ownFiles.includes(h));
  const consumedExternal = external.filter((h) => !h.file.startsWith('controllers/'));
  results.push({
    field,
    total: hits.reduce((s, h) => s + h.count, 0),
    own: ownFiles,
    external,
    consumedExternal
  });
}

console.log('=== WRITE-ONLY CANDIDATES (no external/behavior consumers) ===');
for (const r of results) {
  if (r.consumedExternal.length === 0 && r.external.length === 0) {
    console.log(`  ${r.field.padEnd(32)} total=${r.total}`);
  }
}
console.log('\n=== ONLY other-controller mentions (settings read by other controllers) ===');
for (const r of results) {
  const otherCtrl = r.external.filter((h) => h.file.startsWith('controllers/'));
  if (r.consumedExternal.length === 0 && otherCtrl.length > 0) {
    console.log(`  ${r.field.padEnd(32)} ctrl=${otherCtrl.map((h) => h.file.replace('controllers/', '')).join(',')}`);
  }
}
console.log('\n=== CONSUMED (behavior reads them) ===');
for (const r of results) {
  if (r.consumedExternal.length > 0) {
    console.log(`  ${r.field.padEnd(32)} ${r.consumedExternal.map((h) => h.file.replace(/\//g, '/')).slice(0, 4).join(', ')}`);
  }
}
