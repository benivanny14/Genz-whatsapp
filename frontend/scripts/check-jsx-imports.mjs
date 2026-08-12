// check-jsx-imports — scans frontend/src for JSX tags used but never imported
// or defined in the same file. Catches crashes like `<X .../>` or `<Sync .../>`
// used without an import (ReferenceError / missing lucide-react export).
//
// Exit code: 1 when a tag matches a real lucide-react export that the file
// forgot to import (a guaranteed runtime crash). Unknown tags are printed as
// warnings only — many are legitimate (destructured props, library globals).
//
// Usage: node scripts/check-jsx-imports.mjs   (npm run check:jsx)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

// Real lucide-react exports (from node_modules)
const lucide = new Set(Object.keys(await import('lucide-react')));

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) files.push(p);
  }
}
walk(SRC);

// Globals that are fine (React APIs, browser globals, common libs)
const GLOBALS = new Set([
  'React', 'Fragment', 'Suspense', 'lazy', 'memo', 'forwardRef', 'StrictMode', 'createContext', 'useState',
  'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle',
  'useId', 'useTransition', 'useDeferredValue', 'useSyncExternalStore', 'useInsertionEffect', 'useDebugValue',
  'window', 'document', 'navigator', 'history', 'localStorage', 'sessionStorage', 'performance', 'console', 'globalThis',
  'Symbol', 'Promise', 'Date', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Error', 'Map', 'Set',
  'URL', 'URLSearchParams', 'RegExp', 'Intl', 'AbortController', 'FormData', 'Blob', 'File', 'FileReader', 'Image',
  'Audio', 'Video', 'MediaRecorder', 'Notification', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker', 'ServiceWorker',
  'BarcodeDetector', 'GeolocationPosition', 'PositionError', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver',
  'CustomEvent', 'Event', 'MouseEvent', 'KeyboardEvent', 'TouchEvent', 'PointerEvent', 'MessageEvent', 'StorageEvent',
  'toast', 'Swal', 'fetch', 'crypto', 'atob', 'btoa', 'structuredClone', 'queueMicrotask', 'requestAnimationFrame',
  'cancelAnimationFrame', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'genz', 'echarts', 'screenfull'
]);

const issues = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const defined = new Set(GLOBALS);

  // imports (non-lucide): default + named + namespace
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*,\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]/g)) defined.add(m[1]);
  for (const m of src.matchAll(/import\s+\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g)) {
    for (const name of m[1].split(',')) {
      const clean = name.trim();
      if (!clean) continue;
      defined.add(clean.split(/\s+as\s+/).pop().trim().replace(/[^A-Za-z0-9_$]/g, ''));
    }
  }
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s*['"][^'"]+['"]/g)) defined.add(m[1]);
  for (const m of src.matchAll(/import\s+\*\s+as\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);

  // local declarations
  for (const m of src.matchAll(/(?:const|let|var|function|class)\s+([A-Z][A-Za-z0-9_$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:const|let|var|function|class)\s+([A-Z][A-Za-z0-9_$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/export\s*\{[^}]*\}/g)) {
    for (const name of m[0].replace('export', '').replace(/[{}]/g, '').split(',')) defined.add(name.trim().split(/\s+as\s+/).pop().trim());
  }
  // assignments like  Foo = () => ...
  for (const m of src.matchAll(/([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(/g)) defined.add(m[1]);
  for (const m of src.matchAll(/([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:React\.)?(?:memo|forwardRef|lazy|createContext)\(/g)) defined.add(m[1]);
  // destructured props  ({ icon: Icon, ... }) = props / ({ Icon }) =>  — the tag may arrive via props
  for (const m of src.matchAll(/\(\{([^}]*)\}\)\s*=>/g)) {
    for (const part of m[1].split(',')) {
      const clean = part.trim();
      if (!clean) continue;
      const alias = clean.match(/([A-Z][A-Za-z0-9_$]*)\s*$/);
      if (alias) defined.add(alias[1]);
    }
  }

  // JSX tags used
  const used = new Set();
  for (const m of src.matchAll(/<([A-Z][A-Za-z0-9_$]*)(?=[\s/>.])/g)) used.add(m[1]);

  for (const tag of used) {
    if (defined.has(tag)) continue;
    if (lucide.has(tag)) {
      issues.push({ file, tag, kind: 'ERROR_MISSING_IMPORT' });
    } else if (/^[A-Z]/.test(tag)) {
      issues.push({ file, tag, kind: 'WARN_UNKNOWN_TAG' });
    }
  }
}

const errors = issues.filter((i) => i.kind === 'ERROR_MISSING_IMPORT');
const warnings = issues.filter((i) => i.kind === 'WARN_UNKNOWN_TAG');

for (const i of issues) {
  console.log(`[${i.kind}] ${i.tag}  →  ${path.relative(SRC, i.file)}`);
}
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}) — usually destructured props / string literals; verify manually if a screen crashes.`);
}
if (errors.length) {
  console.log(`\n✗ ${errors.length} missing import(s) that would crash at runtime.`);
  process.exit(1);
}
if (issues.length === 0) console.log('No missing-import issues found.');
else console.log('\n✓ No crash-level missing imports.');
