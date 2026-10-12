import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(path, "utf8");

test("AI meal direct entry opens the existing outside-menu sheet on the photo tab", async () => {
  const [page, outsideMenu] = await Promise.all([
    source("app/nutrition/page.tsx"),
    source("components/client/OutsideMenuFood.tsx"),
  ]);

  assert.match(page, /aiMeal\?: string/);
  assert.match(page, /openAiPhoto=\{query\.aiMeal === "1"\}/);
  assert.match(outsideMenu, /useState\(openAiPhoto\)/);
  assert.match(outsideMenu, /initialTab=\{openAiPhoto \? "photo" : "text"\}/);
});
