// A deliberately empty service worker.
//
// Chrome will not offer to install a site without one that handles fetch, so
// this exists to satisfy that - and does nothing else. It caches nothing.
//
// That is the point. Every screen in START is server-rendered per request behind
// an auth cookie: a menu, a workout in progress, a client list. A caching worker
// would serve one person's data from another person's device after a logout, or
// show a coach a menu they edited an hour ago and believe they had saved. The
// offline behaviour the app does have is deliberate and narrow - the client's
// own workout snapshot, mirrored to localStorage, cleared on sign-out - and it
// belongs there rather than in an intermediary that cannot tell whose data it
// is holding.
//
// If real offline caching is wanted later it needs a considered policy per
// route, not a blanket one.

self.addEventListener("install", () => {
  // Take over immediately rather than waiting for every tab to close, so an
  // updated worker never lingers.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Straight to the network, always. Passing the request through untouched keeps
  // cookies, redirects and streaming exactly as they would be without a worker.
  event.respondWith(fetch(event.request));
});
