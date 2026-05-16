const APP_SHELL_CACHE = "zerithdb-app-shell-v1";
const RUNTIME_CACHE = "zerithdb-runtime-v1";

const APP_SHELL_URLS = [
  "/",
  "/docs",
  "/playground",
  "/blog",
  "/logo.svg",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/offline.html",
];

const STATIC_ASSET_PATTERN = /^\/(?:_next\/static|.*\.(?:css|js|mjs|png|jpg|jpeg|svg|webp|ico|woff2?))$/i;

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);

  await Promise.allSettled(
    APP_SHELL_URLS.map((url) => cache.add(new Request(url, { cache: "reload" }))),
  );
}

async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  const expectedCaches = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);

  await Promise.all(
    cacheNames
      .filter((cacheName) => !expectedCaches.has(cacheName))
      .map((cacheName) => caches.delete(cacheName)),
  );
}

function canHandleRequest(request) {
  const url = new URL(request.url);

  return (
    request.method === "GET" &&
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match("/offline.html")) ||
      (await caches.match("/"))
    );
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (!canHandleRequest(event.request)) {
    return;
  }

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  }
});
