const CACHE = 'addball-shell-v2';
const relativeShell = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

const scopedUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(relativeShell.map(scopedUrl));

    // Viteが生成したhash付きJS/CSSも初回install時にapplication shellへ含める。
    const html = await fetch(scopedUrl('./index.html')).then((response) => response.text());
    const assets = [...html.matchAll(/(?:src|href)="((?:\.\/)?assets\/[^"?]+)"/g)]
      .map((match) => scopedUrl(match[1]));
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return caches.match(scopedUrl('./index.html'));
      return Response.error();
    }
  })());
});
