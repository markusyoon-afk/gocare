/**
 * GoCARE service worker — offline app shell for the installable PWA.
 *
 * Playbook pitfall #1 (the hard one): the offline fallback is NAVIGATE-ONLY.
 * We never return cached index.html for a failed *script/asset* request —
 * doing so executes HTML as JS and bricks the installed app. Navigations get
 * the cached shell; assets are cache-first with a network fill, and a failed
 * asset simply fails (no HTML substitution).
 */

const CACHE = "gocare-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
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
  // Leave cross-origin (Google Fonts, etc.) to the browser.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached shell. NAVIGATE-ONLY fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./"))),
    );
    return;
  }

  // Same-origin assets: cache-first, then network (and cache what we fetch).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
