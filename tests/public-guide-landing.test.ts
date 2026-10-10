import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the public guide contains all seven videos in course order", async () => {
  const [page, player] = await Promise.all([
    file("app/guide/page.tsx"),
    file("app/guide/GuideVideo.tsx"),
  ]);
  const sources = [
    "01-login-home-navigation",
    "02-personal-menu-meals",
    "03-outside-menu-shopping",
    "04-workout-program-session",
    "05-workout-management-progress",
    "06-measurements-health-checkin",
    "07-messages-content-profile-support",
  ];

  assert.equal((player.match(/<video/g) ?? []).length, 1);
  assert.match(page, /<GuideVideo/);
  assert.doesNotMatch(page, /\bSTART\b/);
  assert.equal((page.match(/src: "\/media\/life-fit-training\//g) ?? []).length, 7);
  let previous = -1;
  for (const source of sources) {
    const position = page.indexOf(source);
    assert.ok(position > previous, `${source} is missing or out of order`);
    previous = position;
  }
});

test("every guide video is introduced by a title and description", async () => {
  const page = await file("app/guide/page.tsx");
  const lessonData = page.match(/const lessons = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  assert.equal((lessonData.match(/description:/g) ?? []).length, 7);
  assert.equal((lessonData.match(/points:/g) ?? []).length, 7);
  assert.match(page, /lessonCopy[\s\S]*lesson\.description[\s\S]*videoShell/);
});

test("the guide route stays public and uses the sales-page visual language", async () => {
  const [proxy, route, styles] = await Promise.all([
    file("proxy.ts"),
    file("app/media/life-fit-training/[lesson]/route.ts"),
    file("app/guide/page.module.css"),
  ]);
  assert.doesNotMatch(proxy, /["']\/guide["']/);
  assert.match(route, /PUBLIC_STORAGE_ORIGIN/);
  assert.match(route, /bacxfweisncnpjgiqxcp\.supabase\.co/);
  assert.match(styles, /--green: #17a44a/);
  assert.match(styles, /--lime: #b7ff3c/);
  assert.match(styles, /--ink: #0a0c0b/);
});
