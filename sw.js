// Service Worker: App-Shell offline verfügbar machen.
const VERSION = 'lmci-v1.3.1';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './src/app.js', './src/state.js',
  './src/data/exercises.js', './src/data/muscles.js', './src/data/mobility.js', './src/data/foods.js',
  './src/engine/util.js', './src/engine/plan.js', './src/engine/cardio.js', './src/engine/progression.js', './src/engine/nutrition.js', './src/engine/analytics.js',
  './src/engine/recovery.js', './src/engine/food.js', './src/engine/achievements.js', './src/engine/reminders.js', './src/engine/quick.js', './src/engine/gamification.js',
  './src/ui/dom.js', './src/ui/charts.js', './src/ui/bodymap.js', './src/ui/timer.js', './src/ui/icons.js', './src/ui/celebrate.js', './src/ui/onboarding.js', './src/ui/heute.js', './src/ui/planview.js', './src/ui/workout.js',
  './src/ui/fortschritt.js', './src/ui/ernaehrung.js', './src/ui/foodpicker.js', './src/ui/mehr.js', './src/ui/uebungen.js', './src/ui/kalender.js', './src/ui/coach.js', './src/ui/schnell.js',
  './vendor/anthropic-sdk.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // Neue Version vorbereiten; aktiv wird sie erst, wenn die App es anstößt (Hinweis „Jetzt aktualisieren“) oder beim nächsten Start.
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
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
