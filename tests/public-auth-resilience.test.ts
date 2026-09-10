import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public auth screens do not create the workout database client during render", async () => {
  const repository = await readFile(
    new URL("../lib/workouts/supabase-repository.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(repository, /const supabase=createSupabaseBrowserClient\(\)/);
  assert.match(repository, /new Proxy/);
});

test("the global session watcher leaves a misconfigured login screen visible", async () => {
  const watcher = await readFile(
    new URL("../components/auth/AuthSessionWatcher.tsx", import.meta.url),
    "utf8",
  );

  assert.match(watcher, /try \{\s*supabase = createSupabaseBrowserClient\(\)/);
  assert.match(watcher, /catch \{\s*return;/);
});
