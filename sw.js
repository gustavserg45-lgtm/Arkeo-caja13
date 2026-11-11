// GitHub Pages: rutas relativas para /arqueo-express/ y actualización online.
const CACHE_NAME = 'arqueo-express-static-v1.1.2';
const CORE_ASSETS = [
  './', './index.html', './app.js', './styles.css', './cashier.css',
  './icon.svg', './manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(CORE_ASSETS))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith('arqueo-express-static-') && key !== CACHE_NAME)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // Online: mostrar siempre el archivo actualizado; offline: usar copia local.
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch {
      const fallback = await cache.match(request);
      if (fallback) return fallback;
      if (request.mode === 'navigate') return await cache.match('./index.html');
      return Response.error();
    }
  }));
});
