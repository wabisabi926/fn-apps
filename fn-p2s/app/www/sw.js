const PREFIX = new URL(self.registration.scope).pathname.replace(/\/$/, "");

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (u.pathname === PREFIX || u.pathname.startsWith(PREFIX + "/")) return;
  if (!u.pathname.startsWith("/")) return;
  u.pathname = PREFIX + u.pathname;
  e.respondWith(fetch(new Request(u, e.request)));
});
