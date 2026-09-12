import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/202609100001_check_in_eve_reminder.sql", import.meta.url),
  "utf8",
);

test("Thursday creates the requested check-in-eve card in Israel time", () => {
  assert.match(migration, /timezone\('Asia\/Jerusalem', now\(\)\)::date/);
  assert.match(migration, /extract\(dow from v_today\) = 4/);
  assert.match(migration, /⏰ מחר צ׳ק־אין בבוקר/);
});

test("the advance reminder is weekly-deduped and keeps Friday's reminder", () => {
  assert.match(migration, /'check-in-tomorrow-' \|\| v_week/);
  assert.match(migration, /extract\(dow from v_today\) = 5/);
  assert.match(migration, /'check-in-reminder-' \|\| v_week/);
});

test("clients who already checked in do not receive either reminder", () => {
  const weeklyCheck = /public\.israel_week_start\(submitted_at\) = public\.israel_week_start\(now\(\)\)/g;
  assert.equal([...migration.matchAll(weeklyCheck)].length, 2);
});
