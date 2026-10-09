import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("terms describe the health declaration and do not present automation as a medical review", async () => {
  const terms = await source("app/terms/page.tsx");
  assert.match(terms, /הצהרת בריאות והתחלת אימונים/);
  assert.match(terms, /תוכנית שנוצרה אוטומטית אינה מעידה על בדיקה אישית/);
  assert.match(terms, /אין להתחיל בתוכנית עד לקבלת אישור מתאים/);
  assert.match(terms, /הצהרת המשתמש אינה.*אישור רפואי/);
});

test("privacy policy identifies health-screening data and its automated use", async () => {
  const privacy = await source("app/privacy/page.tsx");
  assert.match(privacy, /תשובתו להצהרת הבריאות/);
  assert.match(privacy, /החלטה אוטומטית מוגבלת/);
  assert.match(privacy, /הפעלת תוכנית האימונים מושהית/);
  assert.match(privacy, /במסלול דיגיטלי עצמאי/);
});
