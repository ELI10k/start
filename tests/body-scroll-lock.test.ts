import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireBodyScrollLock,
  releaseOrphanedBodyScrollLock,
} from "../lib/browser/body-scroll-lock.ts";

const fakeBody = (overflow = "") => ({ style: { overflow } });

test("restores scrolling only after every overlapping modal releases its lock", () => {
  const body = fakeBody();
  const releaseFirst = acquireBodyScrollLock(body);
  const releaseSecond = acquireBodyScrollLock(body);

  assert.equal(body.style.overflow, "hidden");
  releaseFirst();
  assert.equal(body.style.overflow, "hidden");
  releaseSecond();
  assert.equal(body.style.overflow, "");
});

test("release is idempotent and preserves the pre-existing inline value", () => {
  const body = fakeBody("clip");
  const release = acquireBodyScrollLock(body);

  assert.equal(body.style.overflow, "hidden");
  release();
  release();
  assert.equal(body.style.overflow, "clip");
});

test("navigation clears a stale hidden overflow when no modal owns it", () => {
  const body = fakeBody("hidden");

  releaseOrphanedBodyScrollLock(body);

  assert.equal(body.style.overflow, "");
});

test("navigation never unlocks a modal that is still open", () => {
  const body = fakeBody();
  const release = acquireBodyScrollLock(body);

  releaseOrphanedBodyScrollLock(body);
  assert.equal(body.style.overflow, "hidden");

  release();
  assert.equal(body.style.overflow, "");
});
