import assert from "node:assert/strict";
import test from "node:test";
import { getAttentionFlags, getLatestCheckIn, missingWeeklyUpdate, updatedThisWeek } from "../lib/check-ins/calculations.ts";
import type { WeeklyCheckIn } from "../lib/check-ins/types.ts";
import { readFile } from "node:fs/promises";
import {
  CHECK_IN_PHOTO_MAX_BYTES,
  CHECK_IN_PHOTO_URL_TTL_SECONDS,
  uploadCheckInPhotos,
  validateCheckInPhoto,
} from "../lib/check-ins/photo-storage.ts";
import {
  coachCheckInStatus,
  comparisonDelta,
} from "../lib/check-ins/coach.ts";
const now = new Date("2026-07-19T18:00:00");
const entry: WeeklyCheckIn = { id: "c", clientId: "client", date: "2026-07-19", weightKg: 80, waistCm: 88, hunger: 2, sleep: 4, energy: 1, trainingCompleted: false, note: "יש קושי השבוע" };
test("weekly status is deterministic with an injected date", () => { assert.equal(updatedThisWeek([entry], now), true); assert.equal(missingWeeklyUpdate([entry], now), false); assert.equal(getLatestCheckIn([entry]), entry); });
test("attention flags expose only direct rules", () => assert.deepEqual(getAttentionFlags([entry], now), ["low-hunger", "low-energy", "concern-mentioned"]));
test("empty check-in history is missing and requires attention", () => { assert.equal(missingWeeklyUpdate([], now), true); assert.deepEqual(getAttentionFlags([], now), ["missing-update"]); });
test("check-in review migration preserves coach/client RLS and records review metadata", async () => { const sql = await readFile(new URL("../supabase/migrations/202607200011_check_ins_and_progress_completion.sql", import.meta.url), "utf8"); for (const rule of ["reviewed_at", "reviewed_by", "apply_check_in_review", "review_check_in", "review_response_required", "public.is_coach_for"]) assert.match(sql, new RegExp(rule)); });
test("client and coach check-in surfaces use the persisted actions rather than demo state", async () => { const [action, coach, progress] = await Promise.all([readFile(new URL("../app/actions/product.ts", import.meta.url), "utf8"), readFile(new URL("../app/coach/clients/[id]/page.tsx", import.meta.url), "utf8"), readFile(new URL("../app/progress/page.tsx", import.meta.url), "utf8")]); assert.match(action, /saveCheckIn/); assert.match(action, /saveProgress/); assert.match(action, /reviewCheckIn/); assert.match(action, /review_check_in/); assert.match(coach, /ReviewCheckInForm/); assert.match(progress, /PersistedProgressHistory/); });
test("private check-in storage constrains file access to the owner or active coach",async()=>{const sql=await readFile(new URL("../supabase/migrations/202607280003_check_in_photo_storage.sql",import.meta.url),"utf8");const hardening=await readFile(new URL("../supabase/migrations/202607280004_check_in_photo_storage_hardening.sql",import.meta.url),"utf8");for(const rule of ["check-in-photos','check-in-photos',false","check_in_photo_client_upload","check_in_photo_client_read","check_in_photo_coach_read","check_in_photo_client_delete","coach_client_relationships","r.status='active'"])assert.match(sql,new RegExp(rule));assert.match(hardening,/check_in_photo_client_update/)});
test("photo policies cover CRUD for owner and active coach without public access", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607280005_check_in_photo_complete_policies.sql", import.meta.url), "utf8");
  for (const operation of ["insert", "update", "delete"])
    assert.match(sql, new RegExp(`coach_${operation}[\\s\\S]*r\\.status = 'active'`));
  for (const operation of ["update", "delete"])
    assert.match(sql, new RegExp(`client_${operation}[\\s\\S]*auth\\.uid\\(\\)`));
  assert.doesNotMatch(sql, /to\s+(anon|public)/i);
});
test("photo validation rejects invalid types and oversized files", () => {
  assert.match(validateCheckInPhoto({ type: "application/pdf", size: 12 }) ?? "", /JPG/);
  assert.match(validateCheckInPhoto({ type: "image/jpeg", size: CHECK_IN_PHOTO_MAX_BYTES + 1 }) ?? "", /5MB/);
  assert.equal(validateCheckInPhoto({ type: "image/webp", size: CHECK_IN_PHOTO_MAX_BYTES }), null);
});
function photoHarness(options: { uploadFailureAt?: number; recordFailureAt?: number; cleanupFailures?: number } = {}) {
  const removed: string[][] = [];
  let uploadCount = 0;
  let recordCount = 0;
  let cleanupCount = 0;
  const storage = {
    async upload() {
      uploadCount += 1;
      return { error: uploadCount === options.uploadFailureAt ? new Error("upload") : null };
    },
    async remove(paths: string[]) {
      cleanupCount += 1;
      removed.push([...paths]);
      return { error: cleanupCount <= (options.cleanupFailures ?? 0) ? new Error("cleanup") : null };
    },
  };
  const rows = {
    async insert() {
      recordCount += 1;
      return { error: recordCount === options.recordFailureAt ? new Error("record") : null };
    },
  };
  return { storage, rows, removed };
}
const fakePhoto = { type: "image/jpeg", size: 20 } as File;
test("upload failure removes all previously uploaded files", async () => {
  const harness = photoHarness({ uploadFailureAt: 2 });
  const result = await uploadCheckInPhotos({ ...harness, files: [{ view: "front", file: fakePhoto }, { view: "side", file: fakePhoto }], clientId: "client", checkInId: "check", randomId: () => "id" });
  assert.deepEqual(result, { ok: false, reason: "upload", cleanupOk: true });
  assert.deepEqual(harness.removed, [["client/check/front-id.jpg"]]);
});
test("record failure removes current and earlier objects", async () => {
  const harness = photoHarness({ recordFailureAt: 2 });
  const result = await uploadCheckInPhotos({ ...harness, files: [{ view: "front", file: fakePhoto }, { view: "side", file: fakePhoto }], clientId: "client", checkInId: "check", randomId: () => "id" });
  assert.equal(result.ok, false);
  assert.deepEqual(harness.removed, [["client/check/front-id.jpg", "client/check/side-id.jpg"]]);
});
test("partial cleanup is retried and accurately reported", async () => {
  const harness = photoHarness({ uploadFailureAt: 2, cleanupFailures: 1 });
  const result = await uploadCheckInPhotos({ ...harness, files: [{ view: "front", file: fakePhoto }, { view: "side", file: fakePhoto }], clientId: "client", checkInId: "check", randomId: () => "id" });
  assert.equal(result.ok, false);
  assert.equal("cleanupOk" in result && result.cleanupOk, true);
  assert.equal(harness.removed.length, 2);
});
test("history uses only five-minute signed URLs and exposes all photo states", async () => {
  const [repository, gallery] = await Promise.all([
    readFile(new URL("../lib/data/product-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/client/CheckInPhotoGallery.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(CHECK_IN_PHOTO_URL_TTL_SECONDS, 300);
  assert.match(repository, /createSignedUrls/);
  assert.doesNotMatch(repository, /getPublicUrl|publicUrl/);
  for (const state of ["טוענים תמונה", "לא צורפו תמונות", "לא ניתן לטעון"])
    assert.match(gallery, new RegExp(state));
});
test("server actions accept three maximum-size photos while per-file validation stays at 5MB", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /bodySizeLimit:\s*"16mb"/);
  assert.equal(CHECK_IN_PHOTO_MAX_BYTES, 5 * 1024 * 1024);
});
test("coach check-in queue distinguishes new, responded and handled states", () => {
  assert.equal(coachCheckInStatus({ status: "submitted", handled_at: null }), "new");
  assert.equal(coachCheckInStatus({ status: "reviewed", handled_at: null }), "responded");
  assert.equal(coachCheckInStatus({ status: "submitted", handled_at: "2026-07-28T12:00:00Z" }), "handled");
});
test("check-in comparison calculates numeric changes without inventing missing data", () => {
  assert.equal(comparisonDelta(80, 78.5), -1.5);
  assert.equal(comparisonDelta(null, 78.5), null);
});
test("coach check-in migration protects handled state and points new notifications to the queue", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607280006_coach_check_in_module.sql", import.meta.url), "utf8");
  for (const rule of ["handled_at", "handled_by", "set_check_in_handled", "public.current_role\\(\\) <> 'coach'", "public.is_coach_for\\(client_id\\)", "/coach/check-ins\\?status=new"])
    assert.match(sql, new RegExp(rule));
});
test("coach check-in screen includes filters, comparison, photos, response and handled action", async () => {
  const [page, card, repository, dashboard] = await Promise.all([
    readFile(new URL("../app/coach/check-ins/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/coach/CoachCheckInCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/data/product-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/coach/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const rule of ["client", "status", "from", "to", "compareA", "compareB", "CheckInComparison"])
    assert.match(page, new RegExp(rule));
  for (const rule of ["CheckInPhotoGallery", "ReviewCheckInForm", "CheckInHandledForm"])
    assert.match(card, new RegExp(rule));
  assert.match(repository, /createSignedUrls/);
  assert.match(dashboard, /צ׳ק־אינים חדשים/);
});
