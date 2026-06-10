// Service worker — makes the Cymatics Machine offline-capable after first load.
//
// Strategy:
//   • Navigations (HTML): network-first, fall back to cache. Keeps the app fresh
//     on deploy (the HTML points at the latest hashed assets) while still loading
//     offline from the last-seen copy.
//   • Other GETs (hashed JS/CSS, immutable): cache-first, populate on miss.
//
// All sound is synthesised and there are no media files, so the whole app is
// just this shell — once cached it runs with no network at all.

const CACHE = 'cymatics-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop old cache versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin

  const isNavigation =
    req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match(self.registration.scope))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }),
    ),
  );
});
