import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  INITIAL_NAVEL_MAX_CM,
  INITIAL_NAVEL_MIN_CM,
  israelDateKey,
  parseOptionalInitialNavel,
} from "../lib/progress/measurements.ts";

test("initial navel circumference is optional and bounded", () => {
  assert.deepEqual(parseOptionalInitialNavel(null), { ok: true, value: null });
  assert.deepEqual(parseOptionalInitialNavel(""), { ok: true, value: null });
  assert.deepEqual(parseOptionalInitialNavel("90.5"), { ok: true, value: 90.5 });
  for (const invalid of [
    "not-a-number",
    String(INITIAL_NAVEL_MIN_CM - 0.1),
    String(INITIAL_NAVEL_MAX_CM + 0.1),
    "0",
    "-80",
  ]) {
    assert.equal(parseOptionalInitialNavel(invalid).ok, false);
  }
});

test("creation date is derived in Asia/Jerusalem", () => {
  assert.equal(israelDateKey(new Date("2026-07-28T21:30:00.000Z")), "2026-07-29");
  assert.equal(israelDateKey(new Date("2026-01-01T21:30:00.000Z")), "2026-01-01");
});

test("coach creation stores weight and navel in the central progress row idempotently", async () => {
  const [action, form, history, coachProfile] = await Promise.all([
    readFile(new URL("../app/actions/onboarding.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/coach/CreateClientForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/client/PersistedProgressHistory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/coach/clients/[id]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(form, /היקף טבור התחלתי \(ס״מ\)/);
  assert.match(form, /name="navelCircumference"/);
  assert.match(action, /from\("progress_entries"\)\.upsert/);
  assert.match(action, /navel_circumference:initialNavel\.value/);
  assert.match(action, /onConflict:"client_id,date"/);
  assert.match(action, /date:israelDateKey\(\)/);
  assert.match(action, /is_test_account:coachProfile\.is_test_account/);
  assert.match(history, /מגמת היקף טבור/);
  assert.match(history, /entry\.navel_circumference \?\? "—"/);
  assert.match(coachProfile, /אין עדיין מדידת היקף טבור/);
  assert.match(coachProfile, /find\(\(entry\)=>entry\.navel_circumference!==null\)/);
});
