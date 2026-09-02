import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const chatArea = fs.readFileSync(path.join(root, 'components/ChatArea.jsx'), 'utf8');

// ─── Helper: extract the line numbers of early returns and hooks ───
function findEarlyReturns(src) {
  const results = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match `if (!selectedConversation)` or `if (isLocked)` at component level
    if (/^if\s*\(\s*!selectedConversation\s*\)\s*\{/.test(line) ||
        /^if\s*\(\s*isLocked\s*\)\s*\{/.test(line)) {
      results.push({ line: i + 1, text: line });
    }
  }
  return results;
}

function findHooks(src) {
  const results = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match useState, useEffect, useCallback, useMemo, useRef at component level
    if (/^(const|let|var)\s+\w+.*=\s*(useState|useEffect|useCallback|useMemo|useRef)\(/.test(line) ||
        /^use(Effect|State|Callback|Memo|Ref|Context|Reducer|ImperativeHandle|LayoutEffect|DebugValue|Id)\(/.test(line) ||
        /^const\s+\w+\s*=\s*use(Context|Chat|User|Stickers|Prompt|InactivityLock)\(/.test(line)) {
      results.push({ line: i + 1, text: line.substring(0, 80) });
    }
  }
  return results;
}

// ─── Test 1: early returns exist (intentional) ───
test('ChatArea has early returns for no selection and locked chats', () => {
  const earlyReturns = findEarlyReturns(chatArea);
  assert.ok(earlyReturns.length >= 2, 'ChatArea should have at least 2 early returns');
  assert.ok(
    earlyReturns.some(r => r.text.includes('!selectedConversation')),
    'Should have early return for no selected conversation'
  );
  assert.ok(
    earlyReturns.some(r => r.text.includes('isLocked')),
    'Should have early return for locked chat'
  );
});

// ─── Test 2: all hooks come before early returns ───
test('all hooks are declared before the early returns (Rules of Hooks)', () => {
  const earlyReturns = findEarlyReturns(chatArea);
  const hooks = findHooks(chatArea);

  assert.ok(earlyReturns.length > 0, 'Should find early returns');
  assert.ok(hooks.length > 50, `Should find many hooks, found ${hooks.length}`);

  const firstEarlyReturn = Math.min(...earlyReturns.map(r => r.line));
  const lastHook = Math.max(...hooks.map(h => h.line));

  assert.ok(
    lastHook < firstEarlyReturn,
    `Last hook (line ${lastHook}) must come before first early return (line ${firstEarlyReturn}). ` +
    `This prevents "Rendered fewer hooks than expected" errors.`
  );
});

// ─── Test 3: no hooks after early returns ───
test('no useState/useEffect/useCallback/useMemo after early returns', () => {
  const earlyReturns = findEarlyReturns(chatArea);
  const firstEarlyReturn = Math.min(...earlyReturns.map(r => r.line));
  const lines = chatArea.split('\n');

  for (let i = firstEarlyReturn; i < lines.length; i++) {
    const line = lines[i].trim();
    // Allow const assignments and plain function calls, but not hook calls
    const isHook = /^(useState|useEffect|useCallback|useMemo|useRef)\(/.test(line);
    assert.ok(
      !isHook,
      `Found hook call at line ${i + 1} after early return at line ${firstEarlyReturn}: ${line.substring(0, 60)}`
    );
  }
});

// ─── Test 4: the comment warning about hooks exists ───
test('has safety comment about hooks before early returns', () => {
  assert.ok(
    chatArea.includes('NEVER add early returns below this line') ||
    chatArea.includes('All hooks and memos above'),
    'Should have a comment warning about hooks ordering'
  );
});

// ─── Test 5: usePrompt is called before early returns ───
test('usePrompt hook is called before early returns', () => {
  const usePromptPos = chatArea.indexOf('usePrompt()');
  const earlyReturns = findEarlyReturns(chatArea);
  const firstEarlyReturn = Math.min(...earlyReturns.map(r => r.line));
  const usePromptLine = chatArea.substring(0, usePromptPos).split('\n').length;

  assert.ok(
    usePromptLine < firstEarlyReturn,
    `usePrompt (line ${usePromptLine}) must be called before early returns (line ${firstEarlyReturn})`
  );
});
