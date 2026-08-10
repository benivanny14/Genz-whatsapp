const fs = require('fs');
const path = require('path');

// For every route file, verify each handler imported from a controller exists
// as an export of that controller. Handles destructured, renamed, and
// whole-module require styles, plus both `exports.x` and `module.exports = {}`.
const routes = fs.readdirSync('routes').filter(f => f.endsWith('.js'));
let problems = 0;
for (const route of routes) {
  const src = fs.readFileSync(path.join('routes', route), 'utf8');
  const reqRe = /require\('\.\.\/controllers\/(\w+)'\)/g;
  let m;
  while ((m = reqRe.exec(src))) {
    const controllerFile = path.join('controllers', m[1] + '.js');
    if (!fs.existsSync(controllerFile)) {
      console.log(`MISSING CONTROLLER: ${route} -> ${m[1]} (${controllerFile})`);
      problems++;
      continue;
    }
    const ctrl = fs.readFileSync(controllerFile, 'utf8');
    const exportsSet = new Set();
    for (const ex of ctrl.matchAll(/^exports\.(\w+)\s*=/gm)) exportsSet.add(ex[1]);
    const modEx = ctrl.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
    if (modEx) {
      for (const name of modEx[1].matchAll(/(\w+)/g)) exportsSet.add(name[1]);
    }
    const isExported = name => exportsSet.has(name);

    // Find the variable binding(s) for this require.
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const line = src.slice(lineStart, m.index);
    // Strip `= require(...)` so `line` is the LHS, e.g. `const { a, b }` or `const ctrl`.
    const lhs = line.replace(/=\s*$/, '').trim();
    const destr = lhs.match(/\{\s*([^}]*)\s*\}$/);
    const wanted = [];
    if (destr) {
      for (const part of destr[1].split(',')) {
        const p = part.trim();
        if (!p) continue;
        const [local, exportedName] = p.split(':').map(s => s.trim());
        wanted.push(exportedName || local);
      }
    } else {
      // whole-module require: `const ctrl = require(...)` — verify usages `ctrl.name`
      const binding = lhs.replace(/^const\s+/, '').trim();
      const usages = src.matchAll(new RegExp(`\\b${binding}\\.(\\w+)`, 'g'));
      for (const u of usages) wanted.push(u[1]);
    }
    for (const name of wanted) {
      if (!isExported(name)) {
        console.log(`MISSING EXPORT: ${route} needs ${name} from ${m[1]}.js`);
        problems++;
      }
    }
  }
}
console.log(problems ? `${problems} problem(s)` : 'All route handler imports resolve to existing exports');
