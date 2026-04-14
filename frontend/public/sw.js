const CACHE_NAME = 'livesoko-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 1. Skip non-GET and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // 2. Network-first strategy with offline fallback for navigation
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        // If it's a navigation request (asking for an HTML page), show offline.html
        if (event.request.mode === 'navigate' || 
            (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
          return caches.match('/offline.html');
        }
        
        // Let it fail for other assets (images, css) if not cached
        return Response.error();
      });
    })
  );
});
