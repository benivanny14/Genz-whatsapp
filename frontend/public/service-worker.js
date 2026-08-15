// Genz Messenger Service Worker v5
// Handles: Push notifications (foreground+background), offline cache, background sync
//
// v5 change: /version.json and the APK must NEVER be served from the cache.
// The cache-first handler below used to swallow /version.json (only refetching
// on cache miss), so the login page version line and the in-app update banner
// kept showing the version from the user's FIRST visit forever — a new
// release was invisible until the cache was manually cleared. The APK was
// worse: a stale cached copy could be handed to a user clicking Download,
// installing an old build over a new one. Both now bypass the SW entirely
// (the server also sends Cache-Control: no-store for them).
//
// v4 change: like WhatsApp, the app itself must open while fully offline —
// showing cached chats and an in-app "connecting..." indicator — instead of
// a dead-end "You're Offline" page. Two bugs prevented that before:
//  1) The PWA's start_url is '/?source=pwa', a different string than '/',
//     so a normal browser visit never cached the exact URL the installed
//     app opens with — first offline launch from the home screen fell
//     straight to offline.html even though the app shell WAS cached.
//  2) Any never-before-visited route opened directly while offline (e.g. a
//     deep link) also fell to offline.html instead of loading the cached
//     app shell and letting the client-side router take it from there.
const CACHE_NAME = 'genz-wa-v5';
const APP_SHELL_URL = '/';
const STATIC_CACHE = ['/manifest.json', APP_SHELL_URL];

// ── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.all(STATIC_CACHE.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => clients.claim())
  );
});

// Resolve a navigation fetch to the best cached app shell we have, so the
// SPA (with its own offline banner + IndexedDB-cached chats) can boot and
// take over routing client-side — instead of stopping at a static page.
// Only when we truly have nothing cached at all (e.g. the very first
// launch ever happened offline) do we fall back to offline.html.
const matchAppShell = async (request) => {
  const exact = await caches.match(request);
  if (exact) return exact;
  const shell = await caches.match(APP_SHELL_URL) || await caches.match('/index.html');
  if (shell) return shell;
  const offline = await caches.match('/offline.html');
  return offline || new Response('Offline', { status: 503 });
};

// ── Fetch: network-first for HTML/navigation, cache-first for hashed assets ─
// IMPORTANT: navigation (/, /chat, /settings, etc.) and the app shell HTML
// must NEVER be served stale-first. Vite outputs content-hashed filenames
// per build (e.g. Settings-ABC123.js); if a cached old index.html keeps
// pointing at hashes that no longer exist after a redeploy, every lazy-loaded
// page (Settings, GENZMods, Broadcast, etc.) silently fails to import and
// clicking a menu item appears to do nothing. Network-first for navigation
// avoids this entirely.
//
// A short race timeout is used instead of waiting on fetch() forever: on a
// mobile connection that's technically "online" but has no real signal
// (stuck negotiating), a bare fetch can hang far longer than a person will
// wait, which looked identical to the app being broken. Racing against a
// short timer means a flaky connection falls back to the cached shell
// almost immediately, same as being fully offline.
const NAV_NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Skip API calls, Socket.IO polling, the update manifest (/version.json) and
  // the APK — all must hit the network every time — plus any non-GET request.
  // /version.json is the source of truth for the update banner; the APK must
  // never come from a stale cache entry (see v5 note above).
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('/socket.io/') ||
    request.url.includes('/version.json') ||
    request.url.endsWith('.apk')
  ) {
    return;
  }

  // Navigation requests (HTML / SPA routes) and the root document: network-first
  const isNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  if (isNavigation) {
    e.respondWith(
      new Promise((resolve) => {
        let settled = false;
        const finish = (response) => {
          if (settled) return;
          settled = true;
          resolve(response);
        };

        const timer = setTimeout(() => {
          matchAppShell(request).then(finish);
        }, NAV_NETWORK_TIMEOUT_MS);

        fetch(request)
          .then((response) => {
            clearTimeout(timer);
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
            finish(response);
          })
          .catch(() => {
            clearTimeout(timer);
            matchAppShell(request).then(finish);
          });
      })
    );
    return;
  }

  // Hashed build assets (JS/CSS chunks): safe to cache-first since each
  // build produces unique filenames — but always update the cache in the
  // background so the next install has fresh copies too.
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match('/offline.html').then((offline) => offline || new Response('Offline', { status: 503 })));
    })
  );
});


// ── Push: Show notification even when app is closed ──────────────────────
self.addEventListener('push', (e) => {
  let payload = {};
  try { payload = e.data?.json() || {}; } catch { payload = { title: 'GENZ', body: e.data?.text() || 'New notification' }; }

  // The backend (webPushService.buildPayload) nests everything except
  // title/body/icon/badge/tag inside a `data` object.
  const info = payload.data || payload;
  const notifType = info.type || payload.type;

  const title = payload.title || info.senderName || 'Genz Messenger';
  let body = payload.body || info.text || info.message || '';
  body = String(body).replace(/https?:\/\/[^\s]+/g, '').replace(/www\.[^\s]+/g, '').trim();
  if (!body) body = 'New message';
  const isMessage = notifType === 'message' || notifType === 'group_message' || !notifType;

  const options = {
    body,
    icon: info.senderAvatar || '/icons/icon-192x192.png',
    badge: '/icons/favicon-32x32.png',
    tag: info.conversationId || payload.tag || 'genz-msg',
    renotify: true,
    requireInteraction: false,
    silent: false,
    priority: 'normal',
    vibrate: isMessage ? [100, 50, 100] : [50],
    data: {
      url: info.clickAction || info.url || payload.url || '/',
      conversationId: info.conversationId,
      senderId: info.senderId,
      type: notifType || 'message',
    },
    actions: [{ action: 'open', title: 'Open' }],
    timestamp: Date.now(),
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};

  const targetUrl = data.conversationId ? `/?chat=${data.conversationId}` : (data.url || '/');

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wcs => {
      // Focus existing window if open
      for (const wc of wcs) {
        if (wc.url.startsWith(self.location.origin)) {
          wc.postMessage({ type: 'OPEN_CHAT', conversationId: data.conversationId });
          return wc.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Background sync for offline messages ─────────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-messages') {
    e.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  const allClients = await clients.matchAll({ type: 'window' });
  allClients.forEach(c => c.postMessage({ type: 'SYNC_MESSAGES' }));
}

// ── Message from app ──────────────────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
