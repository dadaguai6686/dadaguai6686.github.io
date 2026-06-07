const CACHE_VERSION = 'atherix-static-v22-prize-track';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=20260608-prize-track-v1',
  '/app.js?v=20260608-prize-track-v1',
  '/lucide.min.js',
  '/manifest.webmanifest',
  '/sitemap.xml',
  '/feed.xml',
  '/assets/atherix-icon.svg',
  '/assets/atherix-icon-192.png',
  '/assets/atherix-icon-512.png',
  '/assets/atherix-og-card.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_VERSION)
        .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (['script', 'style'].includes(request.destination) || ['/app.js', '/style.css', '/sw.js'].includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        }
        return response;
      });
      return cached || network;
    })
  );
});
