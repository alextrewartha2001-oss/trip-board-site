// Trip Board service worker, hand-written (docs/ARCHITECTURE.md). The build fills
// in the version and the list of app files. It keeps the app shell available
// offline; the page itself stores the encrypted data (src/store.ts).
const VERSION = "f83634f11738";
const SHELL = ["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./assets/index-CuLI4tRs.js","./assets/index-BB5rWAmo.css"];
const SHELL_CACHE = `tb-shell-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('tb-shell-') && key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const isData = (url) => /\/(meta\.json|[^/]+\.enc)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || isData(url)) return;

  // App shell: the cached copy first, refreshed in the background when online.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const key = event.request.mode === 'navigate' ? './' : event.request;
      // ignoreVary: a "Vary: Origin" header would otherwise stop a module script matching offline.
      const cached = await cache.match(key, { ignoreSearch: true, ignoreVary: true });
      const fresh = fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.mode !== 'navigate') cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => undefined);
      return cached ?? (await fresh) ?? Response.error();
    }),
  );
});
