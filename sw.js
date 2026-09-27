const CACHE = 'fo-player-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './fo-icon-192.png',
  './fo-icon-512.png',
  './frequency-oasis-player-icon.svg'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // blob: video reads never reach this handler at all — this only ever
  // sees requests for the app's own shell files.
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    // Network-first for the page itself: a desktop box that's been running
    // this for weeks should pick up a redeploy the next time it loads,
    // instead of being stuck forever on whatever was cached on day one.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets rarely change and are safe to serve straight from cache.
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
