import { test } from 'node:test';
import assert from 'node:assert/strict';

const { normalizeStoryHighlight, HIGHLIGHT_COLORS } = await import('../utils/storyHighlightMapping.js');

test('maps name from the API name field', () => {
  const h = normalizeStoryHighlight({ _id: 'a1', name: 'QA Trip' });
  assert.equal(h.id, 'a1');
  assert.equal(h.name, 'QA Trip');
});

test('falls back to legacy title field', () => {
  const h = normalizeStoryHighlight({ _id: 'a1', title: 'Old Highlight' });
  assert.equal(h.name, 'Old Highlight');
});

test('prefers coverUrl over legacy coverImage', () => {
  const h = normalizeStoryHighlight({ _id: 'a1', coverUrl: '/x.png', coverImage: '/y.png' });
  assert.equal(h.coverUrl, '/x.png');
  const legacy = normalizeStoryHighlight({ _id: 'a1', coverImage: '/y.png' });
  assert.equal(legacy.coverUrl, '/y.png');
});

test('preserves createdAt so the view modal shows a real date', () => {
  const h = normalizeStoryHighlight({ _id: 'a1', createdAt: '2026-09-07T00:00:00.000Z' });
  assert.equal(h.createdAt, '2026-09-07T00:00:00.000Z');
});

test('picks ring color by category index', () => {
  const h = normalizeStoryHighlight({ _id: 'a1', category: '2' });
  assert.equal(h.color, HIGHLIGHT_COLORS[2]);
});

test('defaults to the first ring color when category is missing', () => {
  const h = normalizeStoryHighlight({ _id: 'a1' });
  assert.equal(h.color, HIGHLIGHT_COLORS[0]);
});

test('defaults statusIds and attaches local statuses', () => {
  const statuses = [{ _id: 's1' }];
  const h = normalizeStoryHighlight({ _id: 'a1' }, statuses);
  assert.deepEqual(h.statusIds, []);
  assert.equal(h.statuses, statuses);
});

test('handles empty highlight objects', () => {
  const h = normalizeStoryHighlight({});
  assert.equal(h.id, undefined);
  assert.equal(h.name, undefined);
  assert.equal(h.coverUrl, null);
  assert.equal(h.createdAt, undefined);
});