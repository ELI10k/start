import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// A thread that only updates when you reload is a form, not a conversation.
test("the thread and the bell listen for their own rows", async () => {
  const [hook, thread, badge] = await Promise.all([
    source("lib/supabase/use-live-rows.ts"),
    source("components/messages/MessageThread.tsx"),
    source("components/notifications/UnreadNotificationBadge.tsx"),
  ]);
  assert.match(hook, /"use client"/);
  // No second copy of the data in the browser: the server renders the screen
  // again, by the same path a reload would have used.
  assert.match(hook, /router\.refresh\(\)/);
  assert.match(thread, /useLiveRows\("coach_client_messages"/);
  // The coach's subscription is scoped to the conversation on screen.
  assert.match(thread, /filter: clientId \? `client_id=eq\.\$\{clientId\}` : undefined/);
  assert.match(badge, /useLiveRows\("notifications"/);
});

// Asking for a channel name that already exists returns the existing channel,
// and once it has subscribed it refuses new callbacks by throwing. React runs an
// effect twice in development and remounts components in ordinary use, and
// removeChannel does not finish before the next effect starts - so a fixed name
// crashed the second mount. The client's home screen rendered
// "לא הצלחנו לטעון את המסך".
test("a remount gets its own channel, and a failure never takes the screen down", async () => {
  const hook = await source("lib/supabase/use-live-rows.ts");
  assert.match(hook, /let channelSequence = 0/);
  assert.match(hook, /channelSequence \+= 1/);
  assert.match(hook, /`live:\$\{table\}:\$\{filter \?\? "all"\}:\$\{channelSequence\}`/);
  // Everything, including somebody else's library, inside the guard.
  assert.match(hook, /try \{\s*\n\s*const supabase = createSupabaseBrowserClient\(\)/);
  assert.match(hook, /\} catch \(cause\) \{[\s\S]{0,200}live rows unavailable/);
});

// Realtime re-checks the same SELECT policies against the subscriber, so this
// only has to put the tables in the publication - nothing new becomes readable.
test("the two live tables are published, whole rows and all", async () => {
  const migration = await source("supabase/migrations/202608300002_a_conversation_arrives_by_itself.sql");
  for (const table of ["coach_client_messages", "notifications"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} replica identity full`), table);
    assert.match(migration, new RegExp(`alter publication supabase_realtime add table public\\.${table}`), table);
  }
  // A database without Supabase's publication is not a broken migration.
  assert.match(migration, /when undefined_object then raise notice/);
});
