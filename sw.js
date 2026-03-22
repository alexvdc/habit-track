const CACHE_NAME = 'habittrack-v4';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/utils.js',
  './js/pages/board.js',
  './js/pages/dashboard.js',
  './js/pages/weekly.js',
  './js/pages/settings.js',
  './js/components/chart.js',
  './js/components/habit-card.js',
  './js/components/icons.js',
  './js/components/modal.js',
  './js/components/nav.js',
  './js/components/toast.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
