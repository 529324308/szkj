const CACHE_NAME = 'szkj-pwa-v1';
const APP_BASE = new URL(self.registration.scope).pathname;
const APP_SHELL = [
  APP_BASE,
  `${APP_BASE}manifest.json`,
  `${APP_BASE}pwa-192.png`,
  `${APP_BASE}pwa-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled(
          APP_SHELL.map((asset) => cache.add(asset)),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(APP_BASE)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
