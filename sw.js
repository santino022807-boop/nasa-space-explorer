
const SHELL_CACHE = "nasa-shell-v1";
const NASA_CACHE = "nasa-api-v1";

// Save the main website files for offline use.
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key =>
          key !== SHELL_CACHE && key !== NASA_CACHE
        ).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache-first: use saved app files before the network.
async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const saved = await cache.match(request);

  if (saved) return saved;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// Network-first: get fresh NASA data when online.
async function networkFirst(request) {
  const cache = await caches.open(NASA_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const saved = await cache.match(request);
    if (saved) return saved;
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // NASA astronomy data
  if (
    url.hostname === "science.nasa.gov" &&
    url.pathname.includes("/wp-json/wp/v2/apod-basic")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Our own website files
  const scope = new URL(self.registration.scope);

  if (
    url.origin === scope.origin &&
    url.pathname.startsWith(scope.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});
