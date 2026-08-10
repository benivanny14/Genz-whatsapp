const fs = require('fs');
const path = require('path');
const cov = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage/coverage-final.json'), 'utf8'));
const rows = Object.entries(cov).map(([f, d]) => {
  const keys = Object.keys(d.s);
  const hit = keys.filter((k) => d.s[k] > 0).length;
  return { file: f.split(path.sep).pop(), pct: keys.length ? hit / keys.length : 1 };
}).sort((a, b) => a.pct - b.pct);
console.log('Total files:', rows.length);
rows.forEach((r) => console.log(String((r.pct * 100).toFixed(0)).padStart(3) + '%', r.file));
