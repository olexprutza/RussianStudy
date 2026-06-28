// Service Worker — Russian Drill PWA
const CACHE = 'russian-drill-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './fonts/Handjet-Regular.woff2',
  './fonts/IBMPlexMono-Regular.woff2',
  './fonts/IBMPlexMono-Bold.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './deck.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL.map(url => {
      // Use Request with cache:'reload' so we get fresh copies on install
      return new Request(url, { cache: 'reload' });
    })).catch(() => {
      // Partial failures (e.g. missing fonts) should not break install
      return caches.open(CACHE).then(c =>
        Promise.allSettled(SHELL.map(url => c.add(url)))
      );
    }))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Cache-first for app shell; network-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Don't cache non-GET or opaque responses
        if (e.request.method !== 'GET' || !resp || resp.status !== 200 || resp.type === 'opaque')
          return resp;
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});
