import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTextTokens, wrapWithMarker } from '../utils/formatText.js';

test('plain text returns a single text token', () => {
  const tokens = formatTextTokens('hello world');
  assert.deepEqual(tokens, [{ type: 'text', content: 'hello world' }]);
});

test('parses bold markers', () => {
  const tokens = formatTextTokens('a *bold* part');
  assert.deepEqual(tokens, [
    { type: 'text', content: 'a ' },
    { type: 'bold', content: 'bold' },
    { type: 'text', content: ' part' }
  ]);
});

test('parses italic, strikethrough and monospace', () => {
  assert.deepEqual(formatTextTokens('_it_'), [{ type: 'italic', content: 'it' }]);
  assert.deepEqual(formatTextTokens('~strike~'), [{ type: 'strike', content: 'strike' }]);
  assert.deepEqual(formatTextTokens('`mono`'), [{ type: 'mono', content: 'mono' }]);
});

test('unmatched markers stay as plain text', () => {
  const tokens = formatTextTokens('*not closed');
  assert.deepEqual(tokens, [{ type: 'text', content: '*not closed' }]);
  assert.deepEqual(formatTextTokens('a *b* c *d'), [
    { type: 'text', content: 'a ' },
    { type: 'bold', content: 'b' },
    { type: 'text', content: ' c *d' }
  ]);
});

test('underscores inside a word (e.g. @mention usernames) stay plain text', () => {
  // `_gc_` in `@e2e_gc_1786 hello!` must NOT be parsed as italic — WhatsApp
  // only italicizes underscores at word boundaries.
  const tokens = formatTextTokens('@e2e_gc_1786 hello!');
  assert.deepEqual(tokens, [{ type: 'text', content: '@e2e_gc_1786 hello!' }]);
  assert.deepEqual(formatTextTokens('file_name_v2'), [{ type: 'text', content: 'file_name_v2' }]);
  // Space-delimited underscores still italicize.
  assert.deepEqual(formatTextTokens('sema _ndoto_ leo'), [
    { type: 'text', content: 'sema ' },
    { type: 'italic', content: 'ndoto' },
    { type: 'text', content: ' leo' }
  ]);
});

test('handles empty and non-string input', () => {
  assert.deepEqual(formatTextTokens(''), [{ type: 'text', content: '' }]);
  assert.deepEqual(formatTextTokens(null), [{ type: 'text', content: '' }]);
  assert.deepEqual(formatTextTokens(undefined), [{ type: 'text', content: '' }]);
});

test('wrapWithMarker wraps selected text', () => {
  const result = wrapWithMarker('hello world', 0, 5, '*');
  assert.equal(result.value, '*hello* world');
  assert.equal(result.cursorStart, 1);
  assert.equal(result.cursorEnd, 6);
});

test('wrapWithMarker inserts marker at cursor when nothing selected', () => {
  const result = wrapWithMarker('hello', 5, 5, '*');
  assert.equal(result.value, 'hello*text*');
});

test('wrapWithMarker unwraps already-wrapped selection', () => {
  const result = wrapWithMarker('*hello* world', 0, 7, '*');
  assert.equal(result.value, 'hello world');
  assert.equal(result.cursorStart, 0);
  assert.equal(result.cursorEnd, 5);
});
