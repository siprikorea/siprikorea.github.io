// Simple app-shell service worker for the Dual N-Back PWA.
const CACHE = 'dnb-5f74ab78f9a3';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const c = await caches.open(CACHE);
      c.put(req, res.clone()).catch(() => {});
      return res;
    } catch {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});
