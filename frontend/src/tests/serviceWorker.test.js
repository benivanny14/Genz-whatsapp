import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Regression test for the SW fetch-handler fix: /version.json and the APK
// must NEVER be intercepted by the service worker's cache-first handler.
// Before the fix the handler swallowed /version.json (only refetching on
// cache miss), so the login version line and the in-app update banner kept
// showing the version from the user's FIRST visit; a stale cached APK could
// even be handed to a Download click.
//
// The SW is a plain script that talks to `self`, so we load it into a vm
// sandbox with stubs and drive its 'fetch' listener directly.

const swSource = readFileSync(new URL('../../public/service-worker.js', import.meta.url), 'utf8');

function loadSw() {
  const listeners = {};
  const self = {
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
    skipWaiting: () => {},
    location: { origin: 'https://genz-whatsapp.example' },
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve([]),
    },
    registration: { showNotification: () => Promise.resolve() },
  };

  const caches = {
    open: () => Promise.resolve(caches),
    match: () => Promise.resolve(undefined),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    put: () => Promise.resolve(),
    add: () => Promise.resolve(),
  };

  const context = vm.createContext({
    self,
    caches,
    fetch: () => Promise.resolve(new Response('ok', { status: 200 })),
    clients: self.clients,
    Response,
    Promise,
    // Fire immediately so the navigation race never holds the test open.
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    URL,
    console,
    Date,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Map,
  });

  vm.runInContext(swSource, context);
  return listeners;
}

function fireFetch(listeners, { method = 'GET', url, navigate = false, accept }) {
  const request = {
    method,
    url,
    mode: navigate ? 'navigate' : 'no-cors',
    headers: { get: (name) => (name === 'accept' ? accept : null) },
  };
  let respondedWith = false;
  listeners.fetch({ request, respondWith: () => { respondedWith = true; } });
  return respondedWith;
}

test('service worker never intercepts /version.json', () => {
  const listeners = loadSw();
  assert.equal(
    fireFetch(listeners, { url: 'https://genz-whatsapp.example/version.json' }),
    false,
    'version.json must bypass the SW so the update banner sees fresh data'
  );
});

test('service worker never intercepts the APK download', () => {
  const listeners = loadSw();
  assert.equal(
    fireFetch(listeners, { url: 'https://genz-whatsapp.example/genz-whatsapp.apk' }),
    false,
    'the APK must never come from a stale cache entry'
  );
});

test('service worker never intercepts API or socket.io requests', () => {
  const listeners = loadSw();
  assert.equal(
    fireFetch(listeners, { url: 'https://genz-whatsapp.example/api/auth/login' }),
    false
  );
  assert.equal(
    fireFetch(listeners, { url: 'https://genz-whatsapp.example/socket.io/?EIO=4' }),
    false
  );
});

test('service worker never intercepts non-GET requests', () => {
  const listeners = loadSw();
  assert.equal(
    fireFetch(listeners, { method: 'POST', url: 'https://genz-whatsapp.example/' }),
    false
  );
});

test('service worker still handles navigation (network-first shell)', () => {
  const listeners = loadSw();
  assert.equal(
    fireFetch(listeners, {
      url: 'https://genz-whatsapp.example/chat',
      navigate: true,
      accept: 'text/html',
    }),
    true
  );
});

test('service worker still handles hashed build assets (cache-first)', () => {
  const listeners = loadSw();
  assert.equal(
    fireFetch(listeners, { url: 'https://genz-whatsapp.example/assets/Chat-ABC123.js' }),
    true
  );
});
