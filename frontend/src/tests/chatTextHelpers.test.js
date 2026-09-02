import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DISAPPEARING_OPTIONS,
  FONT_OPTIONS,
  extractFirstUrl,
  getEmojiStickerSuggestions,
  escapeRegExp,
  getEntityId,
  getMentionName,
  getActiveMentionToken,
  buildMentionPayload
} from '../utils/chatTextHelpers.js';

test('extractFirstUrl pulls the first http(s) URL or null', () => {
  assert.equal(extractFirstUrl('visit https://example.com/a?b=1 now'), 'https://example.com/a?b=1');
  assert.equal(extractFirstUrl('no url here'), null);
  assert.equal(extractFirstUrl(''), null);
  assert.equal(extractFirstUrl(null), null);
});

test('escapeRegExp escapes regex metacharacters', () => {
  assert.equal(escapeRegExp('a.b(c)[d]'), 'a\\.b\\(c\\)\\[d\\]');
});

test('getEntityId prefers _id then id then the raw value', () => {
  assert.equal(getEntityId({ _id: 'x1', id: 'x2' }), 'x1');
  assert.equal(getEntityId({ id: 'x2' }), 'x2');
  assert.equal(getEntityId('raw'), 'raw');
  assert.equal(getEntityId(undefined), '');
});

test('getMentionName picks username, name, then phoneNumber', () => {
  assert.equal(getMentionName({ username: 'alice', name: 'Alice', phoneNumber: '2557' }), 'alice');
  assert.equal(getMentionName({ name: 'Alice', phoneNumber: '2557' }), 'Alice');
  assert.equal(getMentionName({ phoneNumber: '2557' }), '2557');
  assert.equal(getMentionName({}), '');
});

test('getActiveMentionToken detects the token being typed', () => {
  // cursor 8 = after the full 'ali' token (slice(0,8) = 'hey @ali')
  assert.deepEqual(getActiveMentionToken('hey @ali', 8), { query: 'ali', start: 4, cursor: 8 });
  // cursor 7 cuts the last char — the token in progress is 'al'
  assert.deepEqual(getActiveMentionToken('hey @ali', 7), { query: 'al', start: 4, cursor: 7 });
  assert.equal(getActiveMentionToken('hey alice', 9), null);
  assert.equal(getActiveMentionToken('@ali already done ', 18), null);
});

test('buildMentionPayload only includes participants mentioned in the text', () => {
  const participants = [
    { _id: 'p1', username: 'alice' },
    { _id: 'p2', username: 'bob' },
    { _id: 'p3', username: 'me' }
  ];
  const payload = buildMentionPayload('Hi @alice and @bob!', participants, 'p3');
  assert.deepEqual(payload, [
    { userId: 'p1', username: 'alice' },
    { userId: 'p2', username: 'bob' }
  ]);
  // The current user is never mentioned back, and no @ → empty.
  assert.deepEqual(buildMentionPayload('Hi @me', participants, 'p3'), []);
  assert.deepEqual(buildMentionPayload('plain text', participants, 'p3'), []);
});

test('getEmojiStickerSuggestions returns [] for unknown/empty text', () => {
  assert.deepEqual(getEmojiStickerSuggestions(''), []);
  assert.deepEqual(getEmojiStickerSuggestions('nope'), []);
});

test('constants keep their shapes (used by the chat settings UI)', () => {
  assert.equal(DISAPPEARING_OPTIONS.length, 4);
  assert.equal(DISAPPEARING_OPTIONS[0].value, 'Off');
  assert.equal(FONT_OPTIONS.length, 16);
  assert.equal(FONT_OPTIONS[0].value, 'default');
});
