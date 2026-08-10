import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every request refreshes the session and writes the rotated cookies back", async () => {
  const proxy = await source("proxy.ts");
  // getUser() is what performs the refresh; setAll is what persists the new
  // tokens. Without the second, a refreshed session would be thrown away on
  // every request and the client would be asked for a magic link again.
  assert.match(proxy, /await supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /setAll: \(items, headers\)/);
  assert.match(proxy, /target\.cookies\.set\(name, value, options\)/);
  // The refreshed cookies must reach redirects too, not only pass-throughs.
  assert.match(proxy, /const redirect = \(destination: string\) =>\s*applyPendingAuthState\(NextResponse\.redirect/);
});

test("a signed-in visitor who opens the login screen is sent into the app", async () => {
  const proxy = await source("proxy.ts");
  assert.match(proxy, /if \(path === "\/login" && user\)/);
  assert.match(proxy, /returnPathForRole/);
});

test("an invalid session lands on login, never on unauthorized", async () => {
  const proxy = await source("proxy.ts");
  assert.match(proxy, /if \(!user\) return redirect\(loginPathFor\(requestedPath\)\)/);
  // A revoked device signs the session out locally first, so the next request
  // does not loop back through a half-valid session.
  assert.match(proxy, /await supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
});

test("logout is idempotent and clears the device as well as the session", async () => {
  const route = await source("app/auth/logout/route.ts");
  assert.match(route, /deactivate_current_device/);
  assert.match(route, /signOut\(\{ scope: "local" \}\)/);
  assert.match(route, /Logout is intentionally idempotent/);
  // And it takes the cached workout snapshot off the device with it.
  const watcher = await source("components/auth/AuthSessionWatcher.tsx");
  assert.match(watcher, /SIGNED_OUT/);
  assert.match(watcher, /clearSnapshotCache\(\)/);
});

test("a rotated token refreshes the server components rather than forcing a login", async () => {
  const watcher = await source("components/auth/AuthSessionWatcher.tsx");
  assert.match(watcher, /TOKEN_REFRESHED/);
  assert.match(watcher, /router\.refresh\(\)/);
});

test("the browser client is a singleton, so tabs share one session", async () => {
  const client = await source("lib/supabase/client.ts");
  assert.match(client, /browserClient \?\?= createBrowserClient\(url, anonKey\)/);
});

test("session persistence is covered end to end", async () => {
  const spec = await source("e2e/auth.spec.ts");
  for (const name of [
    "a reload keeps the client signed in",
    "the auth cookies outlive the browser window",
    "a signed-in visitor is not asked for a magic link again",
    "a coach session survives a reload and a second tab",
    "logging out ends the session and protects the routes again",
    "an expired session sends the visitor to login, not to unauthorized",
  ]) {
    assert.ok(spec.includes(name), `missing e2e coverage: ${name}`);
  }
  // The cookie-expiry assertion is the one that catches a session cookie.
  assert.match(spec, /is a session cookie/);
});
