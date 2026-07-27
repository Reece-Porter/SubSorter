// Subscription Ghost service worker.
// Purpose: (1) make the app installable and available offline, and (2) show local
// notifications via the registration and focus the app when one is clicked.
// It does NOT (and cannot, without a backend) push reminders when the app is fully
// closed — the in-app "Due soon" list is the reliable fallback for that.

const CACHE = "subghost-v1";
const APP_SHELL = ["/", "/import", "/review", "/stats", "/settings"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for navigations (fresh app when online), fall back to cache offline.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
  }
});

// Allow the page to trigger a notification through the SW registration.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "notify" && Array.isArray(data.notifications)) {
    for (const n of data.notifications) {
      self.registration.showNotification(n.title, {
        body: n.body,
        tag: n.tag,
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: { url: "/" },
      });
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
