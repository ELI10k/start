import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The worker went from caching nothing to caching one page. These pin where the
// line is, because the cost of getting it wrong is one client's data appearing on
// another client's phone.

test("the manifest is installable, in Hebrew, and points at icons that exist", async () => {
  const manifest = await source("app/manifest.ts");
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/"/);
  assert.match(manifest, /scope: "\/"/);
  assert.match(manifest, /lang: "he"/);
  assert.match(manifest, /dir: "rtl"/);
  assert.match(manifest, /short_name: "START"/);
  assert.match(manifest, /theme_color: "#FFFFFF"/);
  assert.match(manifest, /background_color: "#FFFFFF"/);
  for (const size of ["192x192", "512x512"]) assert.match(manifest, new RegExp(size));
  assert.match(manifest, /purpose: "maskable"/);
});

test("every icon the manifest and the head name is actually in public/", async () => {
  for (const file of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "offline.html"]) {
    const bytes = await readFile(new URL(`../public/${file}`, import.meta.url));
    assert.ok(bytes.length > 0, `public/${file} is missing or empty`);
  }
  // The favicon lives at the App Router's conventional path.
  const favicon = await readFile(new URL("../app/favicon.ico", import.meta.url));
  assert.ok(favicon.length > 0);
});

test("the apple touch icon is declared rather than left to be discovered", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /apple: \[\{ url: "\/apple-touch-icon\.png"/);
  assert.match(layout, /appleWebApp: \{ capable: true, title: "START"/);
  // Safe areas only resolve when the viewport is told to extend under them.
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /themeColor: "#FFFFFF"/);
});

test("the worker is registered, and registration failing costs only the prompt", async () => {
  const registrar = await source("components/client/ServiceWorker.tsx");
  assert.match(registrar, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(registrar, /\.catch\(\(\) => undefined\)/);
  const layout = await source("app/layout.tsx");
  assert.match(layout, /<ServiceWorker \/>/);
});

test("nothing private can reach Cache Storage", async () => {
  const worker = await source("public/sw.js");

  // The allowlist is exact paths, and every one of them is a public static file.
  const list = worker.slice(worker.indexOf("const PUBLIC_ASSETS = ["), worker.indexOf("];", worker.indexOf("const PUBLIC_ASSETS = [")));
  const allowed = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(allowed, ["/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"]);
  for (const path of allowed) {
    assert.doesNotMatch(path, /^\/api\//, `${path} is an API route`);
    assert.doesNotMatch(path, /^\/_next\/(?!static)/, `${path} is not a static asset`);
  }

  // Cross-origin - Supabase above all - is returned from before anything is read.
  assert.match(worker, /if \(url\.origin !== self\.location\.origin\) return;/);
  // Mutations are never served from a cache.
  assert.match(worker, /if \(request\.method !== "GET"\) return;/);
  // A navigation is per-user HTML: fetched every time, and only replaced by the
  // static page when the network itself fails.
  assert.match(worker, /if \(request\.mode === "navigate"\)/);
  assert.match(worker, /fetch\(request\)\.catch\(\(\) =>/);
  // The only writes are the install-time precache of that fixed list.
  const writes = [...worker.matchAll(/cache\.(add|addAll|put)\(/g)].map((match) => match[0]);
  assert.deepEqual(writes, ["cache.add("], `the worker writes to the cache somewhere else: ${writes.join(", ")}`);
});

test("the connectivity probe is not something the worker can answer", async () => {
  const worker = await source("public/sw.js");
  const offline = await source("public/offline.html");
  // The offline page decides the network is back by asking for the manifest. If
  // the worker served that from a cache the button would never recover.
  assert.match(offline, /fetch\("\/manifest\.webmanifest", \{ method: "HEAD", cache: "no-store" \}\)/);
  assert.doesNotMatch(worker, /manifest\.webmanifest"/);
});

test("a new version drops the previous public cache and keeps everything else", async () => {
  const worker = await source("public/sw.js");
  assert.match(worker, /const CACHE = `start-public-\$\{VERSION\}`/);
  // Only this worker's own caches are removed - not whatever else is in Cache
  // Storage - and the current one is kept.
  assert.match(worker, /key\.startsWith\("start-public-"\) && key !== CACHE/);
  assert.match(worker, /self\.skipWaiting\(\)/);
  assert.match(worker, /self\.clients\.claim\(\)/);
});

test("the offline page is self-contained, in Hebrew and RTL", async () => {
  const offline = await source("public/offline.html");
  assert.match(offline, /<html lang="he" dir="rtl">/);
  assert.match(offline, /אין חיבור לאינטרנט/);
  assert.match(offline, /נסה שוב/);
  // Self-contained: it has to render with nothing else in the cache, so it may
  // not reach for a stylesheet, a script, a font or an image.
  assert.doesNotMatch(offline, /<link[^>]+rel="stylesheet"/);
  assert.doesNotMatch(offline, /<script[^>]+src=/);
  assert.doesNotMatch(offline, /<img/);
  assert.doesNotMatch(offline, /@font-face|fonts\.googleapis/);
  // Its script is scoped. A top-level `var status` becomes window.status, a
  // legacy Window property that stringifies whatever it is given - the element
  // is never touched and the retry message silently never appears.
  assert.match(offline, /\(function \(\) \{/);
  assert.doesNotMatch(offline, /^\s*var status =/m);
  // Safe areas, and nothing that can scroll sideways on a phone.
  assert.match(offline, /env\(safe-area-inset-top\)/);
  assert.match(offline, /overflow-x: hidden/);
  assert.match(offline, /viewport-fit=cover/);
});

test("the offline page shows no stored data and never signs anyone out", async () => {
  const offline = await source("public/offline.html");
  // No storage of any kind is read: whatever it displayed would belong to
  // whoever used the phone last.
  assert.doesNotMatch(offline, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(offline, /\/logout|signOut/);
  // And it says what it is rather than implying the app works offline.
  assert.match(offline, /START דורש חיבור לאינטרנט/);
  assert.doesNotMatch(offline, /עובד ללא אינטרנט|זמין במצב לא מקוון/);
});

test("no screen promises that START works without a connection", async () => {
  for (const path of ["public/offline.html", "app/manifest.ts"]) {
    const text = await source(path);
    assert.doesNotMatch(text, /עובדת? ללא אינטרנט|ללא חיבור לאינטרנט אפשר/);
  }
});
