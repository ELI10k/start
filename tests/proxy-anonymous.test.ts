import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");

test("anonymous private requests are redirected before contacting Supabase", () => {
  const cookieGuard = source.indexOf("if (!hasAuthCookie)");
  const authCall = source.indexOf("await supabase.auth.getUser()");
  assert.ok(cookieGuard > 0);
  assert.ok(authCall > cookieGuard);
  assert.match(source, /isPrivatePath\(path\) \? redirect\(loginPathFor\(requestedPath\)\)/);
});

test("public API routes reach their own authorization handler", () => {
  const publicBypass = source.indexOf('if (!isPrivatePath(path) && path !== "/login")');
  const configRead = source.indexOf("const config = getSupabaseConfig()");
  assert.ok(publicBypass > 0);
  assert.ok(configRead > publicBypass);
});
