/* ============================================================
   GENZ WhatsApp — Service Worker (Push Notifications)
   Handles background push events and shows system notifications
   ============================================================ */

const CACHE_NAME = 'genz-v1';
const CACHE_URLS = ['/', '/index.html'];

// ── Install: cache static assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push: show system notification ───────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'GENZ WhatsApp', body: 'You have a new message', icon: '/icon.png', badge: '/badge.png' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch (e) {}
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', conversationId: data.conversationId },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.conversationId || 'genz-msg',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click: focus app or open ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return; }
      return self.clients.openWindow(url);
    })
  );
});

// ── Fetch: serve from cache for offline ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests to prevent caching issues
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response before caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone).catch(() => {});
        });
        return response;
      })
      .catch(() => {
        // If fetch fails, try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If no cache, return a simple offline fallback for HTML only
          if (event.request.destination === 'document') {
            return new Response('<h1>Offline - Please check your connection</h1>', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/html' })
            });
          }
          // For other requests, just fail silently
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
      .catch(() => {
        // Ultimate fallback - return a valid Response
        return new Response('Error', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
