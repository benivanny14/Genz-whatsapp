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
  { file: 'components/ConversationHeader.jsx', ctxVar: 'headerCtx' }
];

function bundleKeys(src, ctxVar) {
  const m = src.match(new RegExp(`const ${ctxVar} = \\{\\s*([\\s\\S]*?)\\s*\\};`));
  assert.ok(m, `${ctxVar} bundle not found in ChatArea.jsx`);
  return [...m[1].matchAll(/\b(\w+)\b/g)].map(x => x[1]);
}

function destructureKeys(componentSrc) {
  const m = componentSrc.match(/const \{\s*([\s\S]*?)\s*\} = ctx;/);
  assert.ok(m, 'ctx destructure not found in component');
  return [...m[1].matchAll(/\b(\w+)\b/g)].map(x => x[1]);
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
