// Service Worker: App-Shell offline verfügbar machen.
// Wichtig: Alle App-Dateien einer Version werden gemeinsam vorgeladen und ausschließlich aus diesem Versions-Cache
// bedient. Es werden nie einzelne Dateien im Hintergrund ausgetauscht – sonst passen die Module nicht mehr zusammen.
const VERSION = 'lmci-v1.5.0';
const RUNTIME = 'lmci-runtime';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './src/app.js', './src/state.js',
  './src/data/exercises.js', './src/data/muscles.js', './src/data/mobility.js', './src/data/foods.js',
  './src/engine/util.js', './src/engine/health.js', './src/engine/plan.js', './src/engine/cardio.js', './src/engine/progression.js', './src/engine/nutrition.js', './src/engine/analytics.js',
  './src/engine/recovery.js', './src/engine/food.js', './src/engine/achievements.js', './src/engine/reminders.js', './src/engine/quick.js', './src/engine/gamification.js', './src/engine/goals.js', './src/engine/challenges.js',
  './src/ui/dom.js', './src/ui/charts.js', './src/ui/bodymap.js', './src/ui/timer.js', './src/ui/icons.js', './src/ui/celebrate.js', './src/ui/motion.js', './src/ui/onboarding.js', './src/ui/heute.js', './src/ui/planview.js', './src/ui/workout.js',
  './src/ui/fortschritt.js', './src/ui/ernaehrung.js', './src/ui/foodpicker.js', './src/ui/mehr.js', './src/ui/uebungen.js', './src/ui/kalender.js', './src/ui/coach.js', './src/ui/schnell.js',
  './vendor/anthropic-sdk.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];
const SHELL_URLS = new Set(SHELL.map((p) => new URL(p, self.registration.scope).href.replace(/\/$/, '/index.html')));

self.addEventListener('install', (event) => {
  // Neue Version komplett vorladen (scheitert eine Datei, bleibt die alte Version aktiv) und sofort übernehmen.
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((p) => new Request(p, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== RUNTIME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const key = url.href.split('?')[0].replace(/\/$/, '/index.html');

  if (sameOrigin && (SHELL_URLS.has(key) || req.mode === 'navigate')) {
    // App-Dateien: nur aus dem Versions-Cache, sonst Netz (ohne den Cache zu verändern).
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req.mode === 'navigate' ? './index.html' : key, { ignoreSearch: true });
        return cached || fetch(req);
      }),
    );
    return;
  }
  // Alles andere (Fonts, sonstige Dateien): Netz zuerst, Cache als Fallback.
  event.respondWith(
    caches.open(RUNTIME).then(async (cache) => {
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    }),
  );
});
