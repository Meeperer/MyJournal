/* Service worker: cache static assets, previews, and recent entry GETs. Do NOT cache auth or POST. */
const CACHE_NAME = "myjo-v2";
const PREVIEW_PREFIX = "/api/entries/previews";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/auth")) return;
  if (url.pathname.startsWith("/api/entries") && !url.pathname.startsWith(PREVIEW_PREFIX) && url.pathname !== "/api/entries") return;
  if (url.pathname === "/api/entries" && !url.searchParams.has("date")) return;

  if (url.pathname.startsWith(PREVIEW_PREFIX)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname === "/api/entries" && url.searchParams.has("date")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static") || url.pathname === "/" || url.pathname.startsWith("/login") || url.pathname.startsWith("/register")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      }))
    );
  }
});
