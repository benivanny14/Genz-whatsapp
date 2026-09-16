import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guard the ChatArea ctx-bundle pattern: every key a child component
 * destructures from `ctx` must exist in the bundle ChatArea builds, and vice
 * versa. A future refactor that drops a dependency silently (undefined at
 * runtime) or leaves a stale key is caught here at test time.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const chatArea = fs.readFileSync(path.join(root, 'components/ChatArea.jsx'), 'utf8');

const bundles = [
  { file: 'components/MessageBubbleList.jsx', ctxVar: 'bubbleCtx' },
  { file: 'components/MessageComposer.jsx', ctxVar: 'composerCtx' },
  { file: 'components/ConversationHeader.jsx', ctxVar: 'headerCtx' },
  { file: 'components/MessageListArea.jsx', ctxVar: 'listCtx' },
  { file: 'components/ChatModals.jsx', ctxVar: 'modalsCtx' }
];

function bundleKeys(src, ctxVar) {
  // Works for `const X = { ... };` and `const X = useMemo(() => ({ ... }), [deps]);`
  const anchor = src.indexOf(`const ${ctxVar} =`);
  assert.ok(anchor !== -1, `${ctxVar} bundle not found in ChatArea.jsx`);
  const open = src.indexOf('{', anchor);
  assert.ok(open !== -1, `${ctxVar} bundle has no object body`);
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  const body = src.slice(open + 1, i);
  return [...body.matchAll(/\b(\w+)\b/g)].map(x => x[1]);
}

function destructureKeys(componentSrc) {
  const endIdx = componentSrc.indexOf('} = ctx;');
  assert.ok(endIdx !== -1, 'ctx destructure not found in component');
  const before = componentSrc.slice(0, endIdx);
  const lastConstBrace = before.lastIndexOf('const {');
  assert.ok(lastConstBrace !== -1, 'const { not found before } = ctx;');
  const open = componentSrc.indexOf('{', lastConstBrace);
  const body = componentSrc.slice(open + 1, endIdx);
  return [...body.matchAll(/\b(\w+)\b/g)].map(x => x[1]);
}

for (const { file, ctxVar } of bundles) {
  const componentSrc = fs.readFileSync(path.join(root, file), 'utf8');
  const keys = destructureKeys(componentSrc);
  const ctxKeys = bundleKeys(chatArea, ctxVar);

  test(`${file}: every destructured key exists in ${ctxVar}`, () => {
    const missing = keys.filter(k => !ctxKeys.includes(k));
    assert.deepEqual(missing, [], `${ctxVar} missing keys needed by ${file}: ${missing.join(', ')}`);
  });

  test(`${file}: ${ctxVar} has no stale keys`, () => {
    const extra = ctxKeys.filter(k => !keys.includes(k));
    assert.deepEqual(extra, [], `${ctxVar} has keys ${file} does not use: ${extra.join(', ')}`);
  });
}
