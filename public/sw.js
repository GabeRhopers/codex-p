// Minimal hand-rolled service worker — no build plugin, no precache
// manifest to keep in sync. Two strategies, chosen per request type:
//
// - Navigations (the HTML document): network-first, falling back to the
//   cached shell only when offline. Always prefer the latest deploy
//   when one is reachable, rather than pinning players to whatever was
//   cached on their first visit.
// - Everything else same-origin (JS/CSS bundles, portraits, fonts,
//   icons): cache-first. Safe specifically because Vite's build output
//   is content-hashed — a file's name only changes when its content
//   does, so a cached response for a given URL is never stale, and a
//   new deploy's new index.html simply references new filenames that
//   fall through to the network once and get cached from then on.
//
// response.clone() is called synchronously, immediately on receiving
// the response, in both branches below — not deferred into the
// caches.open().then() callback. Deferring it is a real bug, not just
// a style nit: this handler returns the *original* response to the
// browser synchronously, which starts consuming its body right away
// (for a navigation, the renderer starts streaming it as soon as
// respondWith's promise settles). If .clone() is only called after
// caches.open() resolves — an async gap — the original body has
// already started being read by then, and clone() throws "Response
// body is already used." Caught this empirically: caches.keys() kept
// coming back empty no matter how long the test waited, and adding
// direct console logging inside the worker (Playwright's
// `context.on('serviceworker')` → `worker.on('console')`, since
// postMessage to clients mid-navigation has its own timing gap) surfaced
// the exact TypeError.
const CACHE = 'seasons-battle-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const forCache = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, forCache)));
          return response;
        })
        .catch(() =>
          // self.registration.scope (not a hardcoded '/') — this app is
          // deployed under /codex-p/ on GitHub Pages, so the cached
          // shell's key is scope-rooted, not domain-rooted. A hardcoded
          // '/' fallback would silently miss on every subpath
          // deployment and never actually serve the offline shell.
          caches.match(request).then((cached) => cached || caches.match(self.registration.scope)),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const forCache = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, forCache)));
          }
          return response;
        }),
    ),
  );
});
