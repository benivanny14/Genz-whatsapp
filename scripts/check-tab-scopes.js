/* Detect identifiers referenced inside GENZSettings tab components that are
 * neither destructured from ctx, declared locally, nor imported at file level.
 * Catches bugs like "ReferenceError: countdown is not defined".
 */
const fs = require('fs');
const path = require('path');
// Resolve babel from the frontend's own node_modules (the script lives in scripts/)
const frontendRoot = path.resolve(__dirname, '../frontend');
const parser = require(path.join(frontendRoot, 'node_modules/@babel/parser'));
const traverse = require(path.join(frontendRoot, 'node_modules/@babel/traverse')).default;

const file = path.resolve(__dirname, '../frontend/src/components/GENZSettings.jsx');
const code = fs.readFileSync(file, 'utf8');

let ast;
try {
  ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'objectRestSpread'],
  });
} catch (e) {
  console.error('Parse failed:', e.message);
  process.exit(1);
}

// File-level imports (component names, icons, hooks)
const imports = new Set();
traverse(ast, {
  ImportDeclaration(p) {
    p.node.specifiers.forEach((s) => {
      if (s.local) imports.add(s.local.name);
    });
  },
});

// Locate each module-level tab component: `const X = ({ ctx }) => { ... }`
const tabs = [];
traverse(ast, {
  VariableDeclarator(p) {
    const init = p.node.init;
    if (
      init &&
      (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') &&
      init.params &&
      init.params.length === 1 &&
      init.params[0].type === 'ObjectPattern' &&
      init.params[0].properties.some((prop) => prop.key && prop.key.name === 'ctx')
    ) {
      const name = p.node.id.name;
      const props = init.params[0].properties.map((prop) => prop.key.name);
      tabs.push({ name, props, fn: init, node: p.node, path: p });
    }
  },
});

const problems = [];
for (const tab of tabs) {
  // Gather identifiers referenced anywhere inside the function body.
  const used = new Set();
  const local = new Set([...tab.props]);
  // Traverse from the declarator (has proper scope/parentPath) instead of
  // from the bare function node.
  const declaratorPath = tab.path;
  declaratorPath.traverse({
    Identifier(path) {
      // Skip property keys and member expression properties (obj.prop, obj?.prop)
      if ((path.parentPath.isMemberExpression() || path.parentPath.isOptionalMemberExpression()) && path.parentPath.node.property === path.node) return;
      if (path.parentPath.isObjectProperty() && path.parentPath.node.key === path.node && !path.parentPath.node.computed) return;
      if (path.parentPath.isObjectMethod() && path.parentPath.node.key === path.node) return;
      // Skip identifiers inside import/export
      if (path.parentPath.isImportSpecifier() || path.parentPath.isExportSpecifier()) return;
      // Skip the declarator's own id (const X = ...)
      if (path.parentPath.isVariableDeclarator() && path.parentPath.node.id === path.node) return;
      used.add(path.node.name);
    },
    VariableDeclarator(path) {
      if (path.node.id.type === 'Identifier') local.add(path.node.id.name);
      else if (path.node.id.type === 'ObjectPattern') {
        path.node.id.properties.forEach((prop) => prop.key && local.add(prop.key.name));
      } else if (path.node.id.type === 'ArrayPattern') {
        path.node.id.elements.forEach((el) => el && local.add(el.name));
      }
    },
    FunctionDeclaration(path) {
      local.add(path.node.id.name);
    },
    FunctionExpression(path) {
      if (path.node.id) local.add(path.node.id.name);
    },
    ClassDeclaration(path) {
      local.add(path.node.id.name);
    },
    Function(path) {
      path.node.params.forEach((param) => {
        if (param.type === 'Identifier') local.add(param.name);
        else if (param.type === 'ObjectPattern') {
          param.properties.forEach((prop) => prop.key && local.add(prop.key.name));
        }        else if (param.type === 'AssignmentPattern') {
          if (param.left.type === 'Identifier') local.add(param.left.name);
        } else if (param.type === 'ArrayPattern') {
          param.elements.forEach((el) => el && local.add(el.name));
        }
      });
    },
  });

  // Exclude known globals
  const globals = new Set([
    'console', 'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number',
    'Boolean', 'Promise', 'setTimeout', 'setInterval', 'clearTimeout',
    'clearInterval', 'localStorage', 'sessionStorage', 'navigator', 'window',
    'document', 'fetch', 'URL', 'Blob', 'FileReader', 'FormData', 'parseInt',
    'parseFloat', 'isNaN', 'RegExp', 'Error', 'Map', 'Set', 'Symbol', 'undefined',
    'null', 'true', 'false', 'typeof', 'require', 'global', 'Intl', 'TextEncoder',
    'TextDecoder', 'atob', 'btoa', 'crypto', 'encodeURIComponent',
    'decodeURIComponent', 'structuredClone', 'AbortController', 'File', 'Audio',
    'Image', 'requestAnimationFrame', 'performance', 'history', 'location',
    'screen', 'Notification', 'navigator', 'matchMedia', 'innerWidth', 'devicePixelRatio',
    'toast', 'process', 'module', 'exports', 'Buffer', 'isFinite', 'escape',
    'unescape', 'self', 'top', 'parent', 'frames', 'opener', 'customElements',
    'EventSource', 'WebSocket', 'DOMException', 'DataTransfer', 'CustomEvent',
  ]);

  const missing = [...used].filter(
    (name) => !local.has(name) && !imports.has(name) && !globals.has(name)
  ).sort();

  if (missing.length) {
    problems.push({ tab: tab.name, missing });
  }
}

if (problems.length) {
  for (const p of problems) {
    console.log(`❌ ${p.tab}: ${p.missing.join(', ')}`);
  }
  process.exit(1);
} else {
  console.log('✅ All tab components reference only in-scope identifiers.');
}
