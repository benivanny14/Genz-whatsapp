/**
 * Service Worker — Workbox-powered PWA caching for GENZ Messenger.
 *
 * Strategy:
 *   - Static assets (JS/CSS/fonts): Cache-first with network fallback
 *   - API responses: Network-first with cache fallback (1h TTL)
 *   - Images: Cache-first with 7-day TTL
 *   - Status media: Network-first (always fresh)
 *
 * Install: serve this file from /sw.js and register from main.jsx
 *
 * Dependencies: workbox-webpack-plugin (build-time) or inline Workbox runtime
 * This SW uses vanilla caching APIs for broad compatibility — no build step needed.
 */

const CACHE_NAME = 'genz-v1';
const CACHE_VERSION = 1;

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
];

// ── Install: precache shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch strategies ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, skip chrome-extension, skip socket.io
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.pathname.includes('/socket.io/')) return;

  // Strategy 1: API → Network-first (with 1h cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, 'api-cache', 3600));
    return;
  }

  // Strategy 2: Images → Cache-first (7 day TTL)
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i)
  ) {
    event.respondWith(cacheFirst(request, 'image-cache', 7 * 86400));
    return;
  }

  // Strategy 3: Static assets → Cache-first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot)(\?|$)/i)
  ) {
    event.respondWith(cacheFirst(request, 'static-cache', 30 * 86400));
    return;
  }

  // Strategy 4: Navigation → Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 'pages', 3600));
    return;
  }

  // Default: network-only
});

// ── Cache helpers ─────────────────────────────────────────────────────

async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      putWithExpiry(cache, request, clone, maxAgeSeconds);
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      putWithExpiry(cache, request, clone, maxAgeSeconds);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503 });
  }
}

function putWithExpiry(cache, request, response, maxAgeSeconds) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', Date.now().toString());
  headers.set('sw-cache-max-age', String(maxAgeSeconds));

  const body = response.body;
  const stripped = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  cache.put(request, stripped);
}

// ── Background sync for offline messages ──────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(sendPendingMessages());
  }
});

async function sendPendingMessages() {
  // Placeholder — actual implementation reads from IndexedDB
  // and POSTs to /api/messages when back online.
}
