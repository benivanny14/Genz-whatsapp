import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import DeletedMessagesList from '../components/DeletedMessagesList.js';

const render = (props) =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement(DeletedMessagesList, props)
  );

test('empty list renders the empty state', () => {
  const html = render({ messages: [], onRestore: () => {} });
  assert.ok(html.includes('No deleted messages found'));
});

test('list renders message content and a Restore button', () => {
  const html = render({
    messages: [{ id: 'm1', content: 'Secret hello', originalContent: 'Secret hello' }],
    onRestore: () => {}
  });
  assert.ok(html.includes('Secret hello'));
  assert.ok(html.includes('Restore'));
});

test('prefers originalContent over the scrubbed content', () => {
  const html = render({
    messages: [{ id: 'm1', content: '[deleted]', originalContent: 'Secret hello' }],
    onRestore: () => {}
  });
  assert.ok(html.includes('Secret hello'));
  assert.ok(!html.includes('[deleted]'));
});

test('survives a message without a timestamp', () => {
  const html = render({
    messages: [{ id: 'm1', content: 'No ts', originalContent: 'No ts' }],
    onRestore: () => {}
  });
  assert.ok(html.includes('No ts'));
});

test('throws on a malformed non-array payload (the scoped boundary catches it at runtime)', () => {
  assert.throws(
    () => render({ messages: { malformed: true }, onRestore: () => {} }),
    /map is not a function/
  );
});
