import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConversationTagsStorageKey,
  loadConversationTags,
  saveConversationTags,
  addConversationTag,
  removeConversationTag,
  getAvailableTags
} from '../utils/conversationTags.js';

const storageKey = 'genz_conversation_tags:test-user';

test('conversation tags are persisted and can be toggled', () => {
  globalThis.localStorage = {
    store: {},
    getItem(key) {
      return this.store[key] ?? null;
    },
    setItem(key, value) {
      this.store[key] = String(value);
    },
    removeItem(key) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    }
  };

  assert.equal(getConversationTagsStorageKey('test-user'), storageKey);

  const empty = loadConversationTags('test-user');
  assert.deepEqual(empty, {});

  const updated = addConversationTag('test-user', 'chat-1', 'Work');
  assert.deepEqual(updated['chat-1'], ['Work']);
  const initialAvailable = getAvailableTags('test-user');
  assert.ok(initialAvailable.includes('Work'));
  assert.ok(initialAvailable.includes('Family'));
  assert.ok(initialAvailable.includes('Favorites'));

  const withSecondTag = addConversationTag('test-user', 'chat-1', 'Family');
  assert.deepEqual(withSecondTag['chat-1'], ['Work', 'Family']);

  const removed = removeConversationTag('test-user', 'chat-1', 'Work');
  assert.deepEqual(removed['chat-1'], ['Family']);
  const available = getAvailableTags('test-user');
  assert.ok(available.includes('Family'));
  assert.ok(available.includes('Favorites'));

  const persisted = loadConversationTags('test-user');
  assert.deepEqual(persisted['chat-1'], ['Family']);
});
