import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportChatAsTxt, exportChatAsWhatsAppTxt } from '../utils/chatExporter.js';
import { parseWhatsAppTxt } from '../utils/chatImporter.js';

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

test('WhatsApp export uses [MM/DD/YYYY, hh:mm:ss AM/PM] Sender: message lines', () => {
  capturedText = '';
  exportChatAsWhatsAppTxt(
    [mkMsg({ content: 'Hello', createdAt: new Date('2025-01-02T15:04:05Z') })],
    'Test Chat',
    'me'
  );
  // 15:04:05 UTC → local time; assert the structural parts (sender + text) and
  // that the line matches the canonical [date, time] prefix shape.
  assert.ok(/^\[\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2} (AM|PM)\] alice: Hello$/.test(capturedText.trim()));
});

test('WhatsApp export marks own messages as You and media as omitted', () => {
  capturedText = '';
  exportChatAsWhatsAppTxt(
    [
      mkMsg({ sender: { _id: 'me', username: 'alice' }, content: 'mine' }),
      mkMsg({ _id: 'm2', messageType: 'image', createdAt: new Date('2025-01-01T10:00:00Z'), sender: { username: 'alice' } })
    ],
    'Test Chat',
    'me'
  );
  assert.ok(capturedText.includes('] You: mine'));
  assert.ok(capturedText.includes('] alice: image omitted'));
});

test('WhatsApp export round-trips through the importer preserving markers', () => {
  capturedText = '';
  const original = [
    mkMsg({ _id: 'r1', content: '*Hello* _world_ ~strike~ `mono`', createdAt: new Date('2025-03-04T12:00:00Z'), sender: { username: 'alice' } }),
    mkMsg({ _id: 'r2', content: 'plain line two', createdAt: new Date('2025-03-04T12:01:00Z'), sender: { _id: 'me', username: 'alice' } })
  ];
  exportChatAsWhatsAppTxt(original, 'Round Trip', 'me');

  const imported = parseWhatsAppTxt(capturedText, {});
  assert.equal(imported.length, 2);
  assert.equal(imported[0].content, '*Hello* _world_ ~strike~ `mono`');
  assert.equal(imported[0].sender.username, 'alice');
  assert.equal(imported[1].content, 'plain line two');
  assert.equal(imported[1].sender.username, 'You');
});
