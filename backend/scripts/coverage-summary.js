const s = require('../coverage/coverage-final.json');

const files = Object.values(s).filter((e) => e.statementMap);
const basename = (p) => p.split(/[\\/]/).pop();

const totalUnits = (key) => files.reduce((acc, f) => acc + Object.keys(f[key] || {}).length, 0);
const hitUnits = (key) => files.reduce(
  (acc, f) => acc + Object.entries(f[key] || {}).filter(([, v]) => {
    if (Array.isArray(v)) return v.some((x) => x > 0);
    return v > 0;
  }).length,
  0
);
const pct = (key) => {
  const t = totalUnits(key);
  return t ? Math.round((hitUnits(key) / t) * 100) : 0;
};

const stmtPct = (f) => {
  const t = Object.keys(f.s).length;
  return t ? (Object.values(f.s).filter((v) => v > 0).length / t) * 100 : 0;
};

const byName = (n) => {
  const f = files.find((e) => basename(e.path) === n);
  return f ? Math.round(stmtPct(f)) : null;
};

const gte = (p) => files.filter((f) => stmtPct(f) >= p).length;

console.log(`=== Overall controller coverage (${files.length} controllers) ===`);
console.log(`Statements: ${pct('s')}%`);
console.log(`Branches  : ${pct('b')}%`);
console.log(`Functions : ${pct('f')}%`);
console.log('');
console.log('=== Highlights (statements) ===');
console.log(`authController        : ${byName('authController.js')}%`);
console.log(`userSettingsController: ${byName('userSettingsController.js')}%`);
console.log('');
console.log(`Controllers >= 75% statements: ${gte(75)}`);
console.log(`Controllers >= 80% statements: ${gte(80)}`);
console.log('');
console.log('=== Lowest (next batch candidates) ===');
files
  .sort((a, b) => stmtPct(a) - stmtPct(b))
  .slice(0, 10)
  .forEach((f) => console.log(`  ${String(Math.round(stmtPct(f))).padStart(3)}% ${basename(f.path)}`));
