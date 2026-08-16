/**
 * Scan the frontend for localStorage keys that are written (setItem) but
 * never read (getItem) anywhere in the codebase. Keys only written are
 * "dead" — features that appear to save state but nothing consumes it.
 *
 * Usage: node scripts/scan-localstorage-dead.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../frontend/src');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
})(root);

// Extract string literal keys from localStorage.setItem / getItem / removeItem
const extractKeys = (code) => {
  const keys = new Set();
  const re = /localStorage\.(setItem|getItem|removeItem)\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(code))) keys.add(m[2]);
  return keys;
};

const written = new Map(); // key -> [files that write]
const read = new Set();    // keys read or removed anywhere

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const keys = extractKeys(code);
  for (const k of keys) {
    // crude: a key is "read" if any getItem/removeItem occurrence exists
    const getRe = new RegExp(`localStorage\\.(getItem|removeItem)\\(\\s*['"\`]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
    const setRe = new RegExp(`localStorage\\.setItem\\(\\s*['"\`]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
    if (getRe.test(code)) read.add(k);
    else if (setRe.test(code)) {
      if (!written.has(k)) written.set(k, []);
      written.get(k).push(path.relative(root, file));
    }
  }
}

const dead = [...written.keys()].filter((k) => !read.has(k)).sort();
console.log(`Scanned ${files.length} files`);
console.log(`\n=== Keys written but NEVER read (${dead.length}) ===`);
for (const k of dead) {
  console.log(`  ${k}`);
  for (const f of written.get(k)) console.log(`      <- ${f}`);
}

// Also flag dynamic keys (written with template literals / variables) for manual review
const dynamic = [];
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const re = /localStorage\.setItem\(\s*([^'"`][^,)]*),\s*JSON\.stringify/g;
  let m;
  while ((m = re.exec(code))) {
    dynamic.push(`${path.relative(root, file)}: ${m[1].trim().slice(0, 80)}`);
  }
}
console.log(`\n=== Dynamic setItem keys (manual review) (${dynamic.length}) ===`);
for (const d of [...new Set(dynamic)].slice(0, 40)) console.log(`  ${d}`);
