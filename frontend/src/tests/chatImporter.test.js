import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWhatsAppTxt, importChatFile } from '../utils/chatImporter.js';

test('parses WhatsApp txt lines preserving formatting markers', () => {
  const txt = [
    '[12/01/2026, 10:00:00 AM] John Doe: Hello *world*!',
    '[12/01/2026, 10:01:00 AM] Jane: _nice_ ~day~ `today`',
    ''
  ].join('\n');
  const messages = parseWhatsAppTxt(txt);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].content, 'Hello *world*!');
  assert.equal(messages[1].content, '_nice_ ~day~ `today`');
  assert.equal(messages[0].sender.username, 'John Doe');
  assert.equal(messages[1].sender.username, 'Jane');
});

test('parses 24h timestamps and ISO dates', () => {
  const txt = '[01/01/2026, 22:30] Alice: hi';
  const messages = parseWhatsAppTxt(txt);
  assert.equal(messages.length, 1);
  assert.ok(new Date(messages[0].createdAt).getHours() === 22);
});

test('maps "You" sender to the current user', () => {
  const messages = parseWhatsAppTxt('[01/01/2026, 09:00] You: hello', { currentUserId: 'u-1' });
  assert.equal(messages[0].sender._id, 'u-1');
  assert.equal(messages[0].sender.username, 'You');
});

test('strips WhatsApp media-omitted suffixes', () => {
  const txt = '[01/01/2026, 09:00] Alice: <Media omitted>';
  const messages = parseWhatsAppTxt(txt);
  assert.equal(messages.length, 0); // only omitted media → no text message
});

test('joins multi-line messages into one', () => {
  const txt = [
    '[01/01/2026, 09:00] Alice: first line',
    'second line',
    '[01/01/2026, 09:01] Bob: ok'
  ].join('\n');
  const messages = parseWhatsAppTxt(txt);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].content, 'first line\nsecond line');
});

test('importChatFile passes JSON arrays through', () => {
  const json = JSON.stringify([{ _id: 'a', content: '*hi*' }]);
  const { messages, format } = importChatFile(json, 'chat.json');
  assert.equal(format, 'json');
  assert.equal(messages[0].content, '*hi*');
});

test('importChatFile rejects non-chat text', () => {
  assert.throws(() => importChatFile('just some random text', 'notes.txt'));
});
