import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  decodeAuthContextHeader,
  encodeAuthContextHeader,
} from "../lib/auth/request-context.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every request refreshes the session and writes the rotated cookies back", async () => {
  const proxy = await source("proxy.ts");
  // getClaims() verifies the JWT and refreshes near-expiry sessions; setAll persists the new
  // tokens. Without the second, a refreshed session would be thrown away on
  // every request and the client would be asked for a magic link again.
  assert.match(proxy, /await supabase\.auth\.getClaims\(\)/);
  assert.match(proxy, /setAll: \(items, headers\)/);
  assert.match(proxy, /target\.cookies\.set\(name, value, options\)/);
  // The refreshed cookies must reach redirects too, not only pass-throughs -
  // both shapes of redirect, since a server action is answered with a header
  // rather than a 307.
  assert.match(proxy, /applyPendingAuthState\(NextResponse\.redirect\(url\)\)/);
  assert.match(proxy, /"x-action-redirect": `\$\{url\.toString\(\)\};replace`/);
  assert.match(proxy, /const isServerAction = Boolean\(request\.headers\.get\("next-action"\)\)/);
});

test("a signed-in visitor who opens the login screen is sent into the app", async () => {
  const proxy = await source("proxy.ts");
  assert.match(proxy, /if \(path === "\/login" && userId\)/);
  assert.match(proxy, /returnPathForRole/);
});

test("an invalid session lands on login, never on unauthorized", async () => {
  const proxy = await source("proxy.ts");
  assert.match(proxy, /if \(!userId\) return redirect\(loginPathFor\(requestedPath\)\)/);
  // A revoked device signs the session out locally first, so the next request
  // does not loop back through a half-valid session.
  assert.match(proxy, /await supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
});

test("client navigation verifies independent access gates in one database roundtrip", async () => {
  const proxy = await source("proxy.ts");
  const parallelChecks = proxy.match(/Promise\.all\(\[([\s\S]*?)\]\);/);
  assert.ok(parallelChecks);
  assert.match(parallelChecks[1], /client_profiles/);
  assert.match(parallelChecks[1], /coach_client_relationships/);
  assert.match(parallelChecks[1], /device_sessions/);
});

test("private pages reuse only the auth context verified and injected by the proxy", async () => {
  const [proxy, repository, context] = await Promise.all([
    source("proxy.ts"),
    source("lib/data/product-repository.ts"),
    source("lib/auth/request-context.ts"),
  ]);
  // Browser-supplied identity headers are removed before any public or private
  // request is forwarded, so they cannot bypass JWT, role or device checks.
  assert.match(proxy, /clearAuthContextHeaders\(new Headers\(request\.headers\)\)/);
  assert.match(context, /headers\.delete\(name\)/);
  // The proxy adds the context only after the private access gates complete.
  const gate = proxy.indexOf("if (!relationship && !onboarding?.onboarding_completed)");
  const injection = proxy.indexOf("forwardedHeaders.set(AUTH_CONTEXT_HEADERS.id");
  assert.ok(gate >= 0 && injection > gate);
  // Server Components take the fast path, while API/direct calls retain the
  // existing claims + profile fallback.
  assert.match(repository, /requestHeaders\.get\(AUTH_CONTEXT_HEADERS\.id\)/);
  assert.match(repository, /await supabase\.auth\.getClaims\(\)/);
  assert.match(repository, /\.from\("profiles"\)/);
});

test("Hebrew profile names remain valid internal headers and round-trip intact", () => {
  const name = "אלי כהן 💪";
  const encoded = encodeAuthContextHeader(name);
  assert.match(encoded, /^[\x00-\xff]*$/);
  assert.equal(decodeAuthContextHeader(encoded), name);
  assert.equal(decodeAuthContextHeader("%E0%A4%A"), "");
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
