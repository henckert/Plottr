/**
 * Service Worker
 * Handles offline caching, network interception, and background sync
 */

const CACHE_VERSION = 'plottr-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/globals.css',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Caching essential files');
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_VERSION)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-API calls
  if (request.method !== 'GET') {
    return;
  }

  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const cache = caches.open(CACHE_VERSION);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request).then((response) => {
            if (response) {
              console.log('[SW] Serving from cache:', request.url);
              return response;
            }
            // Return offline fallback
            return new Response(
              JSON.stringify({
                error: 'Offline - No cached response available',
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log('[SW] Serving from cache:', request.url);
        return response;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful static responses
          if (response.status === 200 && response.type !== 'error') {
            const responseToCache = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // No cache available
          console.warn('[SW] No cached response for:', request.url);
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Background sync - retry failed requests when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-requests') {
    event.waitUntil(
      // Notify clients to retry pending requests
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'RETRY_PENDING_REQUESTS',
          });
        });
      })
    );
  }
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_VERSION).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
