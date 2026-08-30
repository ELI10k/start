// A service worker that holds exactly one page.
//
// Every screen in START is server-rendered per request behind an auth cookie: a
// menu, a workout in progress, a client list. A caching worker would serve one
// person's data from another person's device after a logout, or show a coach a
// menu they edited an hour ago and believe they had saved. So nothing that could
// carry a person is stored here - no navigation HTML, no API response, no
// Supabase call, no image a client uploaded.
//
// What is stored is a static offline page and the app icons: public bytes, the
// same for everyone, and the reason a lost signal shows START's own screen
// instead of the browser's error page.
//
// Requests this worker does not recognise are not answered at all - it returns
// without calling respondWith, so the browser performs its own fetch with
// cookies, redirects and streaming exactly as if no worker existed.

// Bump this to publish a new offline page. The activate step deletes every
// start-public-* cache that is not this one, so an old shell cannot survive a
// deploy - which is the failure mode a version-less cache name produces.
const VERSION = "v3";
const CACHE = `start-public-${VERSION}`;
const OFFLINE_URL = "/offline.html";

// The whole allowlist. Public, static, and each one safe to hand to any visitor.
// The manifest is deliberately absent: the offline page probes it to decide
// whether the network is back, and a cached copy would answer that probe.
const PUBLIC_ASSETS = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Individually, so one missing icon cannot fail the whole install and
      // leave the offline page uncached.
      .then((cache) => Promise.all(PUBLIC_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))))
      // Take over immediately rather than waiting for every tab to close, so an
      // updated worker never lingers behind an old one.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      // Only this worker's own public caches. Anything another tool put in Cache
      // Storage is left alone rather than deleted on its behalf.
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("start-public-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Reads only. A POST is a mutation and never comes from a cache.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Supabase, fonts, anything not ours: untouched, and never stored.
  if (url.origin !== self.location.origin) return;

  // A page the coach navigated to. Always the network first - the answer is
  // per-user HTML and is never written to the cache. Only when the network
  // genuinely fails does the public offline page stand in, and it is served for
  // the failed URL, so the address bar still holds where they were going and a
  // reload takes them back there.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL, { cacheName: CACHE })
          .then((cached) => cached ?? new Response(
            "<!doctype html><html lang=\"he\" dir=\"rtl\"><meta charset=\"utf-8\"><title>אין חיבור</title><p>אין חיבור לאינטרנט.</p>",
            { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
          )),
      ),
    );
    return;
  }

  // The handful of public files above, by exact path. Cache first, because they
  // do not change without a version bump.
  if (PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request, { cacheName: CACHE }).then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // Everything else - /api, /_next, RSC payloads, uploads - is not answered here
  // and therefore never enters Cache Storage.
});

// ---------------------------------------------------------------------- push
//
// A push arrives while START is closed, so this is the only code that runs. The
// body is the same four fields the in-app notification row carries - title,
// body, href, category - encrypted end to end, which is why the push service
// that relayed it could not read them.
//
// The browser requires a notification to be shown for every push it delivers.
// A payload that cannot be read is still a real notification that was sent, so
// it is shown plainly rather than swallowed - swallowing it is what makes a
// browser revoke the permission.

const NOTIFICATION_FALLBACK = { title: "START", body: "יש עדכון חדש", href: "/notifications" };

self.addEventListener("push", (event) => {
  let payload = NOTIFICATION_FALLBACK;
  try {
    const data = event.data ? event.data.json() : null;
    if (data && typeof data.title === "string" && data.title.trim()) {
      payload = {
        title: data.title.trim().slice(0, 120),
        body: typeof data.body === "string" ? data.body.slice(0, 300) : "",
        // Only an in-app path is ever followed. An absolute URL in a payload
        // would send a tap to another site from inside the app.
        href: typeof data.href === "string" && data.href.startsWith("/") && !data.href.startsWith("//")
          ? data.href
          : NOTIFICATION_FALLBACK.href,
      };
    }
  } catch {
    // Left as the fallback.
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    dir: "rtl",
    lang: "he",
    data: { href: payload.href },
    // One notification per destination. A client who did not open the app does
    // not need four rows saying the same thing.
    tag: payload.href,
    renotify: true,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data && event.notification.data.href;
  const target = typeof href === "string" && href.startsWith("/") && !href.startsWith("//") ? href : "/notifications";
  const url = new URL(target, self.location.origin).href;

  // Focus a tab that is already open rather than stacking another one, and take
  // it to the screen the notification was about.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("navigate" in client) return client.navigate(url).then((navigated) => navigated && navigated.focus());
        return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
