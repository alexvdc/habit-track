const CACHE_NAME = 'habittrack-v7';
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
  './js/components/heatmap.js',
  './js/components/notifications.js',
  './js/components/celebration.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first: try fresh version, fallback to cache if offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Update cache with fresh response
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});
