import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { checkInPhotoCycle } from "../lib/check-ins/photo-cycle.ts";

test("photos are required on every fourth submitted check-in", () => {
  assert.equal(checkInPhotoCycle(0).photosRequired, false);
  assert.equal(checkInPhotoCycle(1).photosRequired, false);
  assert.equal(checkInPhotoCycle(2).photosRequired, false);
  assert.equal(checkInPhotoCycle(3).photosRequired, true);
  assert.equal(checkInPhotoCycle(4).photosRequired, false);
  assert.equal(checkInPhotoCycle(7).photosRequired, true);
});

test("the photo cycle depends only on submitted count and survives skipped weeks", () => {
  assert.deepEqual(checkInPhotoCycle(2), {
    submittedCount: 2,
    nextCheckInNumber: 3,
    position: 3,
    photosRequired: false,
    remainingUntilPhotos: 1,
  });
});

test("server, form, migration and progress gallery enforce the fourth check-in flow", async () => {
  const [action, page, inputs, migration, progress] = await Promise.all([
    readFile(new URL("../app/actions/product.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/check-in/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/client/CheckInPhotoInputs.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202607290002_fourth_check_in_photo_cycle.sql", import.meta.url), "utf8"),
    readFile(new URL("../components/client/ProgressPhotoGallery.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(action, /files\.length!==3/);
  assert.match(action, /בצ׳ק־אין הרביעי חובה/);
  assert.match(page, /photosRequired=\{cycle\.photosRequired\}/);
  assert.match(inputs, /הגיע הזמן לעדכן תמונות התקדמות/);
  assert.match(inputs, /required=\{required\}/);
  assert.match(migration, /mod\(v_submitted_count \+ 1, 4\) = 0/);
  assert.match(migration, /partition by client_id/);
  assert.match(progress, /גלריה והשוואה בין שני מועדים/);
  assert.doesNotMatch(migration, /30 days|interval '30 days'/i);
});
