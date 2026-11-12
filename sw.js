// Shri Hanuman Chalisa - Offline Service Worker (website only; not registered in the APK)
// Bump CACHE_NAME whenever a cached file changes so old caches are dropped on activate.
const CACHE_NAME = 'hanuman-chalisa-v6';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/chalisa-meanings.js',
  './js/chalisa-data.js',
  './js/speech-matcher.js',
  './js/app.js',
  './manifest.json',
  './fonts/fonts.css',
  './icons/mark.svg',
  './icons/icon-192.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('PWA cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin files. Range requests (audio seeking)
// and cross-origin requests (Google Fonts) go straight to the network.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // ignoreSearch: the page asks for style.css?v=5.0 but the cache key is ./style.css
  const cached = caches.match(req, { ignoreSearch: true });
  const network = fetch(req).then((res) => {
    if (res && res.status === 200 && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return res;
  });

  e.respondWith(
    cached.then((hit) => hit || network).catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Response.error()
    )
  );
  e.waitUntil(network.then(() => {}, () => {}));
});
