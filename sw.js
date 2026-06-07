const CACHE_VERSION = 'atherix-static-v26-offline-polish';
const NAVIGATION_FALLBACK_URL = '/index.html';
const STATIC_ASSETS = [
  '/',
  NAVIGATION_FALLBACK_URL,
  '/style.css?v=20260608-offline-polish-v4',
  '/app.js?v=20260608-offline-polish-v4',
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
  const navigationPreloadReady = self.registration.navigationPreload
    ? self.registration.navigationPreload.enable().catch(() => undefined)
    : Promise.resolve();
  event.waitUntil(
    Promise.all([
      navigationPreloadReady,
      caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_VERSION)
        .map(key => caches.delete(key))
      ))
    ])
      .then(() => self.clients.claim())
  );
});

async function cacheResponse(cacheKey, response) {
  if (!response || !response.ok) return;
  const clone = response.clone();
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(cacheKey, clone);
}

async function navigationFallback(preloadResponse, request) {
  try {
    const preload = await preloadResponse;
    if (preload) {
      cacheResponse(NAVIGATION_FALLBACK_URL, preload);
      return preload;
    }
  } catch {
    // Continue to normal network fetch and then cached app shell fallback.
  }

  try {
    const response = await fetch(request);
    cacheResponse(NAVIGATION_FALLBACK_URL, response);
    return response;
  } catch {
    const cached = await caches.match(NAVIGATION_FALLBACK_URL) || await caches.match('/');
    if (cached) {
      const body = await cached.text();
      const headers = new Headers(cached.headers);
      headers.set('X-Atherix-Offline-Shell', 'true');
      headers.set('Cache-Control', 'no-store');
      return new Response(body, { status: 200, statusText: 'OK', headers });
    }
    return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Atherix Offline</title><body><main><h1>Atherix 离线模式</h1><p>应用壳还没有完成缓存，请联网打开一次后再回来。</p></main></body></html>', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Atherix-Offline-Shell': 'true' }
    });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(event.preloadResponse, request));
    return;
  }

  if (['script', 'style'].includes(request.destination) || ['/app.js', '/style.css', '/sw.js'].includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            cacheResponse(request, response);
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
          cacheResponse(request, response);
        }
        return response;
      });
      return cached || network;
    })
  );
});
