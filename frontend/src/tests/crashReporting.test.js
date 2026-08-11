import { test } from 'node:test';
import assert from 'node:assert/strict';

// Fake browser globals installed BEFORE the module is imported so the
// helpers see them at call time (they read globalThis lazily).
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};

const { isCrashReportingEnabled, shouldReportCrash, reportCrashToServer } = await import('../utils/crashReporting.js');

const reset = () => {
  storage.clear();
};

test('crash reporting is opt-in (default off)', () => {
  reset();
  assert.equal(isCrashReportingEnabled(), false);
  storage.set('genz_crash_reporting', '1');
  assert.equal(isCrashReportingEnabled(), true);
});

test('dedupe: same route+message is reported once per window', () => {
  reset();
  storage.set('genz_crash_reporting', '1');
  assert.equal(shouldReportCrash('/genz-mods', 'k.map is not a function'), true);
  assert.equal(shouldReportCrash('/genz-mods', 'k.map is not a function'), false);
  // A different message on the same route is a new report.
  assert.equal(shouldReportCrash('/genz-mods', 'other boom'), true);
});

test('dedupe window: an old entry stops blocking', () => {
  reset();
  // Seed an entry 20 minutes ago.
  storage.set(
    'genz_crash_reported',
    JSON.stringify({ ['/a|boom']: Date.now() - 20 * 60 * 1000 })
  );
  assert.equal(shouldReportCrash('/a', 'boom'), true);
});

test('dedupe map is capped at MAX entries', () => {
  reset();
  for (let i = 0; i < 60; i++) {
    assert.equal(shouldReportCrash('/r', `msg-${i}`), true, `iteration ${i}`);
  }
  const map = JSON.parse(storage.get('genz_crash_reported'));
  assert.ok(Object.keys(map).length <= 50, `capped, got ${Object.keys(map).length}`);
  // The oldest entry was evicted, so it can be reported again.
  assert.equal(shouldReportCrash('/r', 'msg-0'), true);
});

test('reportCrashToServer: no token means no request (anonymous)', () => {
  reset();
  let called = 0;
  globalThis.fetch = () => { called++; return Promise.resolve(); };
  reportCrashToServer('/x', 'boom', {});
  assert.equal(called, 0);
});

test('reportCrashToServer posts to the telemetry endpoint with auth', async () => {
  reset();
  let captured = null;
  globalThis.fetch = (url, opts) => {
    captured = { url, opts };
    return Promise.resolve({ ok: true });
  };
  reportCrashToServer('/genz-mods', 'boom', { token: 'tok-123', base: 'http://x/api' });
  assert.equal(captured.url, 'http://x/api/telemetry/crashes');
  assert.equal(captured.opts.method, 'POST');
  assert.equal(captured.opts.headers.Authorization, 'Bearer tok-123');
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.route, '/genz-mods');
  assert.equal(body.message, 'boom');
});

test('reportCrashToServer never throws on a broken fetch', () => {
  reset();
  globalThis.fetch = () => { throw new Error('network down'); };
  assert.doesNotThrow(() => reportCrashToServer('/x', 'boom', { token: 't' }));
});
