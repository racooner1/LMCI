// Service Worker: App-Shell offline verfügbar machen.
const VERSION = 'lmci-v1.0.0';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './src/app.js', './src/state.js',
  './src/data/exercises.js', './src/data/muscles.js', './src/data/mobility.js',
  './src/engine/util.js', './src/engine/plan.js', './src/engine/cardio.js', './src/engine/progression.js', './src/engine/nutrition.js', './src/engine/analytics.js',
  './src/ui/dom.js', './src/ui/charts.js', './src/ui/onboarding.js', './src/ui/heute.js', './src/ui/planview.js', './src/ui/workout.js', './src/ui/fortschritt.js', './src/ui/ernaehrung.js', './src/ui/mehr.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // Eigene Dateien: Cache zuerst, im Hintergrund aktualisieren. Fremde (Fonts): Netz zuerst, Cache als Fallback.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fetchAndCache = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      if (sameOrigin) {
        if (cached) {
          fetchAndCache.catch(() => {});
          return cached;
        }
        return fetchAndCache;
      }
      return fetchAndCache.then((res) => res || cached);
    }),
  );
});
