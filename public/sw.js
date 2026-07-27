const SHELL_CACHE = "idlib-shell-v1";
const RUNTIME_CACHE = "idlib-runtime-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

// Never cache private/authenticated areas or mutation APIs — avoids leaking
// one account's data to the next person who opens the app on a shared
// device, and avoids serving stale data behind a "successful" offline load.
function isPrivateArea(url) {
  return (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/setup") ||
    url.pathname.startsWith("/login")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (isPrivateArea(url)) return;

    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          // waitUntil extends the worker's lifetime so this write isn't cut
          // off once the response above has already been delivered.
          event.waitUntil(cache.put(request, response.clone()));
          return response;
        } catch {
          return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const networkFetch = (async () => {
          try {
            const response = await fetch(request);
            const cache = await caches.open(SHELL_CACHE);
            event.waitUntil(cache.put(request, response.clone()));
            return response;
          } catch {
            return cached;
          }
        })();
        return cached || networkFetch;
      })(),
    );
  }
});
