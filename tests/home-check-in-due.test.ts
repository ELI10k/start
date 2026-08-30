import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the home check-in tile announces in red when this week is still due", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const checkInDue = israelWeekday\(today\) === 5 && !data\.checkIns\.some/);
  assert.match(source, /trainingWeekStart\(israelDateKey/);
  assert.match(source, /israelWeekday\(today\) === 5/);
  assert.match(source, /הגיע זמן צ׳ק אין/);
  assert.match(source, /quick-action-card__meta--error/);
});
