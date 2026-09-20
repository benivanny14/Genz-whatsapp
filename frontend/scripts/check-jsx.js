const fs = require('fs');
const path = require('path');

const srcRoot = path.resolve(__dirname, '../src');
const files = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
};

walk(srcRoot);

const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
let failed = false;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const importRe = /from\s+['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(text))) {
    const spec = match[1];
    const base = path.resolve(path.dirname(file), spec);
    const exists = extensions.some((ext) => {
      try {
        return fs.statSync(base + ext).isFile();
      } catch {
        return false;
      }
    });
    if (!exists) {
      failed = true;
      console.error(`Missing import in ${path.relative(srcRoot, file)}: ${spec}`);
    }
  }
}

if (failed) process.exit(1);
console.log(`check:jsx passed for ${files.length} files`);
