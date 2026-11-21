const CACHE = 'fo-player-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './fo-icon-192-v2.png',
  './fo-icon-512.png',
  './frequency-oasis-player-icon.svg'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  // Cache each file on its own: one missing file must never abort the whole install
  // (cache.addAll is all-or-nothing, so a single 404 used to break the service worker).
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(u =>
        c.add(new Request(u, { cache: 'reload' })).catch(err => console.warn('SW: skipped', u, err))
      ))
    )
  );
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
    // Network-first for the page itself: a redeploy is picked up the next time it loads,
    // instead of being stuck forever on whatever was cached on day one.
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets rarely change and are safe to serve straight from cache.
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
