import test from 'node:test';
import assert from 'node:assert/strict';
import { getConversationIdFromUrl } from '../utils/notificationRouting.js';

test('extracts conversation id from conversationId and chat query params', () => {
  assert.equal(getConversationIdFromUrl('?conversationId=conv-1'), 'conv-1');
  assert.equal(getConversationIdFromUrl('?chat=conv-2'), 'conv-2');
  assert.equal(getConversationIdFromUrl('?chatId=conv-3'), 'conv-3');
  assert.equal(getConversationIdFromUrl('?foo=bar'), null);
});
