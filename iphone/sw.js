/**
 * GoCARE service worker — network-first so online users always get the latest.
 *
 * Lesson from the field: a cache-first shell serves stale builds after a redeploy
 * (the "my changes aren't showing" trap). For an actively-updated demo we go
 * network-first: fetch fresh when online, fall back to cache only when offline.
 * The offline fallback stays navigate-only (playbook pitfall #1) so a failed
 * asset request never gets HTML in its place.
 */

const CACHE = "gocare-v16";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin (fonts) alone

  // Network-first: always try the network, refresh the cache, fall back only offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") return (await caches.match("./index.html")) || (await caches.match("./"));
        return Response.error();
      }),
  );
});
