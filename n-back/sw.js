// App-shell service worker for the Dual N-Back PWA. The cache name carries
// the build version so each deploy is a new SW that supersedes the old one.
const CACHE = 'dnb-2960d9facb5f';
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
  // Network-first for navigations so a new deploy is picked up while online.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE);
        c.put('./index.html', res.clone()).catch(() => {});
        return res;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }
  // Cache-first for hashed static assets.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const c = await caches.open(CACHE);
      c.put(req, res.clone()).catch(() => {});
      return res;
    } catch {
      return Response.error();
    }
  })());
});
