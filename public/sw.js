const CACHE_NAME = 'popytech-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes Supabase/API
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Network-first pour les pages Next.js
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/dashboard')))
    );
    return;
  }

  // Network-first pour le JS/CSS : un cache-first sur ces fichiers peut
  // servir indefiniment une vieille version apres un deploiement, sans
  // aucune erreur visible (surtout genant sur une PWA installee, ou un
  // Ctrl+F5 classique ne vide pas ce cache). On ne retombe sur le cache
  // que si le reseau echoue vraiment (offline).
  if (
    url.pathname.match(/\.(png|jpg|svg|ico|woff2|css|js)$/)
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});
