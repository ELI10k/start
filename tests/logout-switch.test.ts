import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("direct account-switch logout clears the local session and keeps a safe return path", async () => {
  const route=await readFile(new URL("../app/auth/logout/route.ts",import.meta.url),"utf8");
  assert.match(route,/export async function GET/);
  assert.match(route,/export async function POST/);
  assert.match(route,/signOut\(\{ scope: "local" \}\)/);
  assert.match(route,/safeReturnPath\(request\.nextUrl\.searchParams\.get\("next"\)\)/);
  assert.ok(route.includes('requested??"/login"'));
});
