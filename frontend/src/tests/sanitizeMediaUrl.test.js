import { test } from 'node:test';
import assert from 'node:assert/strict';

// Fake browser globals installed BEFORE the module is imported — the helpers
// read globalThis lazily at call time. With no VITE_API_URL configured the
// API origin falls back to window.location.origin.
globalThis.window = {
  location: { origin: 'https://localhost', protocol: 'https:' }
};

const { sanitizeMediaUrl } = await import('../utils/sanitizeMediaUrl.js');

test('rewrites legacy /uploads/status paths to the API /api/uploads/status mount', () => {
  assert.equal(sanitizeMediaUrl('/uploads/status/abc.mp4'), 'https://localhost/api/uploads/status/abc.mp4');
  assert.equal(
    sanitizeMediaUrl('/uploads/status/abc.mp4?x=1'),
    'https://localhost/api/uploads/status/abc.mp4?x=1'
  );
});

test('passes /api/uploads paths through against the API origin', () => {
  assert.equal(sanitizeMediaUrl('/api/uploads/status/abc.mp4'), 'https://localhost/api/uploads/status/abc.mp4');
});

test('keeps other /uploads paths on the API origin', () => {
  assert.equal(sanitizeMediaUrl('/uploads/chat/abc.png'), 'https://localhost/uploads/chat/abc.png');
});

test('strips stale 0.0.0.0 / localhost:5000 hosts then applies the rewrite rules', () => {
  assert.equal(
    sanitizeMediaUrl('http://0.0.0.0:5000/uploads/status/abc.mp4'),
    'https://localhost/api/uploads/status/abc.mp4'
  );
  assert.equal(
    sanitizeMediaUrl('http://localhost:5000/uploads/chat/abc.png'),
    'https://localhost/uploads/chat/abc.png'
  );
});

test('leaves absolute URLs on other hosts untouched', () => {
  assert.equal(
    sanitizeMediaUrl('https://cdn.example.com/uploads/status/x.png'),
    'https://cdn.example.com/uploads/status/x.png'
  );
});

test('handles empty and non-string input', () => {
  assert.equal(sanitizeMediaUrl(''), '');
  assert.equal(sanitizeMediaUrl(null), null);
  assert.equal(sanitizeMediaUrl(undefined), undefined);
});