// Finca offline service worker. Bump VERSION whenever you change index.html.
const VERSION = "finca-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // App pages: serve from cache instantly, refresh the cache in the background.
  if (req.mode === "navigate") {
    e.respondWith(caches.match("./index.html").then(hit => {
      const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put("./index.html", r.clone())); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Same-origin files and Google Fonts: cache first, then network (and remember it).
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => hit)));
  }
});
