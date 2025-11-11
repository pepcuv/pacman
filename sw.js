const CACHE_VERSION = "v1.0.2";
const STATIC_CACHE = `roman-pacman-static-${CACHE_VERSION}`;
const DATA_CACHE = `roman-pacman-data-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./woordenlijstmaker.html",
  "./levelbuilder.html",
  "./romein.png",
  "./favicon.ico",
  "./favicon2.ico",
];

const DATA_ENDPOINTS = [
  "https://script.google.com/macros/s/AKfycbz85fmgKj32QQOTCJzgUv2iCpnh7JRrdgRLwmrYdRkaYBMAXYuc9FHtaryg9tLf3y0Big/exec",
  "https://script.google.com/macros/s/AKfycbxDpJirwZNmTVFLfVvqv9RXm-eRtlYBWO3xMi9IfFRl8225RZqT5MrYcoyo6cZpgFIC6g/exec",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) => key !== STATIC_CACHE && key !== DATA_CACHE && key.startsWith("roman-pacman-")
          )
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isDataRequest = DATA_ENDPOINTS.some((endpoint) =>
    url.href.startsWith(endpoint)
  );

  if (isDataRequest) {
    event.respondWith(cachedFetch(request, DATA_CACHE));
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request)
          .then((response) => {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
            return response;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
  }
});

function cachedFetch(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cache.match(request))
  );
}
