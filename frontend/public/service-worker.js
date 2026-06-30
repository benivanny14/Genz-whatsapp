// GENZ WhatsApp Service Worker v3
// Handles: Push notifications (foreground+background), offline cache, background sync

const CACHE_NAME = 'genz-wa-v3';
const STATIC_CACHE = ['/manifest.json'];

// ── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_CACHE)).then(() => self.skipWaiting()));
});

// ── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => clients.claim())
  );
});

// ── Fetch: network-first for HTML/navigation, cache-first for hashed assets ─
// IMPORTANT: navigation (/, /chat, /settings, etc.) and the app shell HTML
// must NEVER be served stale-first. Vite outputs content-hashed filenames
// per build (e.g. Settings-ABC123.js); if a cached old index.html keeps
// pointing at hashes that no longer exist after a redeploy, every lazy-loaded
// page (Settings, GENZMods, Broadcast, etc.) silently fails to import and
// clicking a menu item appears to do nothing. Network-first for navigation
// avoids this entirely.
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Skip API calls, Socket.IO polling, and any non-GET requests
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('/socket.io/')
  ) {
    return;
  }

  // Navigation requests (HTML / SPA routes) and the root document: network-first
  const isNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  if (isNavigation) {
    e.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
            .then((res) => res || new Response('Offline', { status: 503 }))
        )
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

  const title = payload.title || payload.senderName || 'GENZ WhatsApp';
  const body = payload.body || payload.text || payload.message || 'You have a new message';
  const isCall = payload.type === 'call' || payload.callType;
  const isMessage = payload.type === 'message' || !payload.type;

  const options = {
    body,
    icon: payload.senderAvatar || '/icons/icon-192x192.png',
    badge: '/icons/favicon-32x32.png',
    tag: payload.conversationId || payload.tag || 'genz-msg',
    renotify: true,
    requireInteraction: isCall,
    silent: false,
    vibrate: isCall ? [300, 100, 300, 100, 300] : isMessage ? [100, 50, 100] : [50],
    data: {
      url: payload.url || '/',
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      type: payload.type || 'message',
      callType: payload.callType,
    },
    actions: isCall
      ? [{ action: 'accept', title: '✅ Answer' }, { action: 'decline', title: '❌ Decline' }]
      : [{ action: 'open', title: '💬 Open' }],
    timestamp: Date.now(),
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};

  if (e.action === 'decline') {
    // Post to app to reject call
    clients.matchAll({ type: 'window' }).then(wcs => {
      wcs.forEach(c => c.postMessage({ type: 'CALL_DECLINE', conversationId: data.conversationId }));
    });
    return;
  }

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
