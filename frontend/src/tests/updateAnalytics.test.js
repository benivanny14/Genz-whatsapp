import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackUpdateEvent, getAnonId, shouldSendEvent } from '../utils/updateAnalytics.js';

function makeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _store: store
  };
}

function withGlobals({ storage, crypto, fetchImpl }, fn) {
  const origStorage = globalThis.localStorage;
  const cryptoDesc = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const fetchDesc = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  if (storage) globalThis.localStorage = storage;
  if (crypto) {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, writable: true, value: crypto });
  }
  if (fetchImpl) {
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchImpl });
  }
  try {
    return fn();
  } finally {
    if (origStorage !== undefined) globalThis.localStorage = origStorage;
    if (crypto && cryptoDesc) Object.defineProperty(globalThis, 'crypto', cryptoDesc);
    if (fetchImpl && fetchDesc) Object.defineProperty(globalThis, 'fetch', fetchDesc);
  }
}

test('getAnonId generates and reuses a stable per-device id', () => {
  const storage = makeStorage();
  withGlobals({ storage, crypto: { randomUUID: () => 'uuid-1234' } }, () => {
    assert.equal(getAnonId(), 'uuid-1234');
    assert.equal(getAnonId(), 'uuid-1234', 'second call reuses the stored id');
    assert.equal(storage.getItem('genz_anon_id'), 'uuid-1234');
  });
});

test('update_shown is deduped per versionCode', () => {
  const storage = makeStorage();
  assert.equal(shouldSendEvent('update_shown', 6), true, 'first shown for v6 sends');
  assert.equal(shouldSendEvent('update_shown', 6), false, 'second shown for v6 is deduped');
  assert.equal(shouldSendEvent('update_shown', 7), true, 'a different version sends again');
  assert.equal(shouldSendEvent('update_dismissed', 6), true, 'non-shown events always send');
});

test('trackUpdateEvent POSTs a fire-and-forget anonymous event', () => {
  const storage = makeStorage();
  let posted = null;
  const fetchImpl = async (url, opts) => {
    posted = { url, opts };
    return { ok: true };
  };
  withGlobals(
    {
      storage,
      crypto: { randomUUID: () => 'uuid-abc' },
      fetchImpl
    },
    () => {
      trackUpdateEvent('update_tapped', { version: '1.1.4', versionCode: 6, platform: 'apk' });
    }
  );
  assert.ok(posted, 'fetch was called');
  assert.equal(posted.url, '/api/telemetry/events');
  assert.equal(posted.opts.method, 'POST');
  assert.equal(posted.opts.keepalive, true);
  const body = JSON.parse(posted.opts.body);
  assert.equal(body.event, 'update_tapped');
  assert.equal(body.version, '1.1.4');
  assert.equal(body.versionCode, 6);
  assert.equal(body.platform, 'apk');
  assert.equal(body.anonId, 'uuid-abc');
});

test('trackUpdateEvent ignores unknown events and never throws', () => {
  const storage = makeStorage();
  let fetchCalled = false;
  withGlobals(
    { storage, fetchImpl: () => { fetchCalled = true; } },
    () => {
      trackUpdateEvent('update_delete_account');
      trackUpdateEvent('update_shown', { versionCode: 6 });
      assert.equal(fetchCalled, true, 'valid event still posts');
    }
  );
  // fetch failing must not throw
  const failing = makeStorage();
  withGlobals(
    { storage: failing, fetchImpl: () => Promise.reject(new Error('network down')) },
    () => {
      assert.doesNotThrow(() => trackUpdateEvent('update_dismissed', { versionCode: 6 }));
    }
  );
});

test('trackUpdateEvent respects the shown dedupe', () => {
  const storage = makeStorage();
  let calls = 0;
  withGlobals(
    { storage, fetchImpl: () => { calls += 1; } },
    () => {
      trackUpdateEvent('update_shown', { versionCode: 6 });
      trackUpdateEvent('update_shown', { versionCode: 6 });
      assert.equal(calls, 1, 'second shown for the same version is not posted');
    }
  );
});
