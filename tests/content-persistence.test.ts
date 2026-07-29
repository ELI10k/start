import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("content migration defines the six-table model with RLS", async () => {
  const [initial, migration] = await Promise.all([
    file("supabase/migrations/202607200001_initial_product.sql"),
    file("supabase/migrations/202607200009_content_library.sql"),
  ]);
  assert.match(initial, /create table public\.content_items/);
  for (const table of [
    "content_categories",
    "content_tags",
    "content_item_tags",
    "content_progress",
    "content_favorites",
  ]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
  }
  assert.match(migration, /content_items_published_read/);
  assert.match(migration, /content_items_coach_all/);
  assert.match(migration, /content_progress_self_all/);
  assert.match(migration, /content_favorites_self_all/);
});

test("content mutations cover coach management and client persistence", async () => {
  const [migration, actions] = await Promise.all([
    file("supabase/migrations/202607200009_content_library.sql"),
    file("app/actions/content.ts"),
  ]);
  for (const rpc of [
    "save_content_item",
    "set_content_item_status",
    "record_content_view",
    "save_content_progress",
    "set_content_favorite",
  ]) {
    assert.match(migration, new RegExp(`function public\\.${rpc}`));
    assert.match(actions, new RegExp(`rpc\\(\"${rpc}\"`));
  }
  assert.match(actions, /requireRole\("coach"\)/);
  assert.match(actions, /requireRole\("client"\)/);
});

test("content repository loads categories, tags, progress and favorites from Supabase", async () => {
  const repository = await file("lib/data/content-repository.ts");
  for (const table of [
    "content_categories",
    "content_items",
    "content_tags",
    "content_item_tags",
    "content_progress",
    "content_favorites",
  ])
    assert.match(repository, new RegExp(`from\\(\"${table}\"\\)`));
  assert.match(repository, /^import "server-only";/);
  assert.doesNotMatch(repository, /localStorage|demoContentItems/);
});

test("active coach and client content screens use the Supabase data layer", async () => {
  const files = await Promise.all([
    file("app/content/page.tsx"),
    file("app/content/[id]/page.tsx"),
    file("app/coach/content/page.tsx"),
    file("app/coach/content/new/page.tsx"),
    file("app/coach/content/[id]/page.tsx"),
    file("components/client/ContentEngagement.tsx"),
  ]);
  const source = files.join("\n");
  assert.match(source, /listPublishedContent/);
  assert.match(source, /listCoachContent/);
  assert.match(source, /ContentForm/);
  assert.match(source, /recordContentView/);
  assert.match(source, /saveContentProgress/);
  assert.match(source, /setContentFavorite/);
  assert.doesNotMatch(source, /localStorage|demoContentItems|contentProgress/);
});

test("content seed runs only when the database has no content", async () => {
  const migration = await file(
    "supabase/migrations/202607200009_content_library.sql",
  );
  assert.match(
    migration,
    /if not exists\(select 1 from public\.content_items\) then/,
  );
  assert.match(migration, /ברוכים הבאים לספריית START/);
  assert.match(migration, /status, sort_order, estimated_minutes/);
});
