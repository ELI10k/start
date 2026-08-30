import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { checkInPhotoCycle } from "../lib/check-ins/photo-cycle.ts";

test("photos are required only on check-ins one and four", () => {
  // The first one is the baseline: a new client used to send three check-ins
  // before the app asked for a single picture, so the fourth set had nothing to
  // be compared against.
  assert.equal(checkInPhotoCycle(0).photosRequired, true);
  assert.equal(checkInPhotoCycle(1).photosRequired, false);
  assert.equal(checkInPhotoCycle(2).photosRequired, false);
  assert.equal(checkInPhotoCycle(3).photosRequired, true);
  assert.equal(checkInPhotoCycle(4).photosRequired, false);
  assert.equal(checkInPhotoCycle(7).photosRequired, false);
  assert.equal(checkInPhotoCycle(11).photosRequired, false);
});

test("only the very first check-in is marked as the first", () => {
  assert.equal(checkInPhotoCycle(0).isFirst, true);
  assert.equal(checkInPhotoCycle(1).isFirst, false);
  assert.equal(checkInPhotoCycle(4).isFirst, false);
});

test("the photo cycle depends only on submitted count and survives skipped weeks", () => {
  assert.deepEqual(checkInPhotoCycle(2), {
    submittedCount: 2,
    nextCheckInNumber: 3,
    position: 3,
    isFirst: false,
    photosRequired: false,
    remainingUntilPhotos: 1,
  });
});

test("server, form, migration and progress gallery enforce the photo flow", async () => {
  const [action, page, inputs, migration, firstMigration, progress] = await Promise.all([
    readFile(new URL("../app/actions/product.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/check-in/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/client/CheckInPhotoInputs.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202607290002_fourth_check_in_photo_cycle.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608180005_first_check_in_photos.sql", import.meta.url), "utf8"),
    readFile(new URL("../components/client/ProgressPhotoGallery.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(action, /files\.length!==3/);
  assert.match(action, /בצ׳ק־אין הראשון ובצ׳ק־אין הרביעי חובה/);
  assert.match(page, /photosRequired=\{cycle\.photosRequired\}/);
  assert.match(page, /firstCheckIn=\{cycle\.isFirst\}/);
  assert.match(inputs, /הגיע הזמן לעדכן תמונות התקדמות/);
  assert.match(inputs, /זה הצ׳ק־אין הראשון שלך/);
  assert.match(inputs, /required=\{required\}/);
  // The trigger is the authority; the client is only the prompt.
  assert.match(migration, /partition by client_id/);
  assert.match(firstMigration, /v_number = 1 or mod\(v_number, 4\) = 0/);
  assert.match(progress, /גלריה והשוואה בין שני מועדים/);
  assert.doesNotMatch(migration, /30 days|interval '30 days'/i);
});
