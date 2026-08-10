import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportChatAsTxt } from '../utils/chatExporter.js';

// Blob/URL.createObjectURL are not available under node:test — stub them so we
// can capture the exported text.
let capturedText = '';
globalThis.Blob = class {
  constructor(parts) {
    capturedText = parts.join('');
  }
};
globalThis.URL.createObjectURL = () => 'blob:test';
globalThis.URL.revokeObjectURL = () => {};
globalThis.document = {
  createElement: () => ({
    click: () => {},
    remove: () => {}
  }),
  body: { appendChild: () => {}, removeChild: () => {} }
};

const mkMsg = (overrides = {}) => ({
  _id: 'm1',
  content: '',
  messageType: 'text',
  createdAt: new Date('2025-01-01T10:00:00Z'),
  sender: { username: 'alice' },
  ...overrides
});

test('plain text messages are exported verbatim (markers preserved)', () => {
  capturedText = '';
  exportChatAsTxt([mkMsg({ content: '*Hello* _world_ ~strike~ `mono`' })], 'Test Chat', 'me');
  assert.ok(capturedText.includes('alice: *Hello* _world_ ~strike~ `mono`'));
});

test('structured messages export media + formatted caption', () => {
  capturedText = '';
  exportChatAsTxt([
    mkMsg({
      messageType: 'structured',
      structuredContent: [
        { type: 'text', value: '*Caption* with _format_' },
        { type: 'image', value: 'http://x/y.jpg' }
      ]
    })
  ], 'Test Chat', 'me');
  assert.ok(capturedText.includes('alice: 📎 Media: *Caption* with _format_'));
});

test('structured text-only messages export the caption', () => {
  capturedText = '';
  exportChatAsTxt([
    mkMsg({
      messageType: 'structured',
      structuredContent: [{ type: 'text', value: 'only *bold* text' }]
    })
  ], 'Test Chat', 'me');
  assert.ok(capturedText.includes('alice: only *bold* text'));
});
