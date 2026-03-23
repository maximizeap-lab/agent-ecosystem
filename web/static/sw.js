// MAP HQ Service Worker — offline shell caching
const CACHE = 'maphq-v1';
const SHELL = ['/m', '/manifest.json', '/sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always network-first for API calls
  if (url.pathname.startsWith('/chat') || url.pathname.startsWith('/run') ||
      url.pathname.startsWith('/stream') || url.pathname.startsWith('/runs') ||
      url.pathname.startsWith('/status') || url.pathname.startsWith('/analytics') ||
      url.pathname.startsWith('/approve') || url.pathname.startsWith('/artifacts')) {
    return; // let browser handle directly
  }
  // Cache-first for shell files
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
