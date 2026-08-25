import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeBarcode,
  parseOpenFoodFactsProduct,
  scannedFoodId,
  validateManualFood,
} from "../lib/nutrition/open-food-facts.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("barcodes are normalised, and only real formats are accepted", () => {
  assert.equal(normalizeBarcode("7290000066318"), "7290000066318");
  assert.equal(normalizeBarcode("  729 000 006 6318 "), "7290000066318");
  assert.equal(normalizeBarcode("12345678"), "12345678");
  // UPC-A is the same product as the EAN-13 with a leading zero, so it is stored
  // one way and never twice.
  assert.equal(normalizeBarcode("012345678905"), "0012345678905");
  for (const bad of ["", "123", "1234567890", "abcdefgh", "123456789012345"]) {
    assert.equal(normalizeBarcode(bad), null, `accepted ${bad}`);
  }
});

test("an Open Food Facts product becomes a food, or is refused", () => {
  const food = parseOpenFoodFactsProduct("7290000066318", {
    product_name: "Cottage 5%",
    brands: "Tnuva, Other",
    serving_size: "100 g",
    product_quantity: "250",
    nutriments: { "energy-kcal_100g": 98, proteins_100g: 11, carbohydrates_100g: 3.4, fat_100g: 5 },
  });
  assert.equal(food?.name, "Cottage 5%");
  assert.equal(food?.brand, "Tnuva", "only the first brand is kept");
  assert.equal(food?.calories, 98);
  assert.equal(food?.protein, 11);
  assert.equal(food?.unitWeightGrams, 250);
  assert.equal(food?.source, "openfoodfacts");
  assert.match(food?.sourceUrl ?? "", /openfoodfacts\.org\/product\/7290000066318/);
});

test("kilojoules convert when kilocalories are the field that is missing", () => {
  const food = parseOpenFoodFactsProduct("7290000066318", {
    product_name: "Something",
    nutriments: { "energy-kj_100g": 418.4 },
  });
  assert.equal(food?.calories, 100);
});

test("a product with no name or no energy is refused rather than guessed at", () => {
  assert.equal(parseOpenFoodFactsProduct("7290000066318", { nutriments: { "energy-kcal_100g": 98 } }), null);
  assert.equal(parseOpenFoodFactsProduct("7290000066318", { product_name: "No energy", nutriments: {} }), null);
  assert.equal(parseOpenFoodFactsProduct("7290000066318", null), null);
  assert.equal(parseOpenFoodFactsProduct("nonsense", { product_name: "x", nutriments: { "energy-kcal_100g": 1 } }), null);
});

test("values that cannot be food per 100g are dropped, not stored", () => {
  // Nothing edible exceeds 900 kcal/100g - that is pure fat - so a higher number
  // is a unit error, and a macro above 100g per 100g is impossible.
  assert.equal(parseOpenFoodFactsProduct("7290000066318", {
    product_name: "Mis-parsed",
    nutriments: { "energy-kcal_100g": 2500 },
  }), null);

  const food = parseOpenFoodFactsProduct("7290000066318", {
    product_name: "Partly wrong",
    nutriments: { "energy-kcal_100g": 200, proteins_100g: 900, fat_100g: 10 },
  });
  assert.equal(food?.protein, null, "an impossible protein value is dropped");
  assert.equal(food?.fat, 10, "the values that are fine survive");
});

test("manual entry reports every problem it finds, in Hebrew", () => {
  assert.deepEqual(validateManualFood({ name: "קוטג׳", calories: 98 }), []);

  const problems = validateManualFood({ name: "", calories: "", barcode: "12" });
  assert.equal(problems.length, 3);
  assert.ok(problems.some((problem) => problem.includes("שם מזון")));
  assert.ok(problems.some((problem) => problem.includes("ברקוד")));
  assert.ok(problems.some((problem) => problem.includes("קלוריות")));

  assert.ok(validateManualFood({ name: "x", calories: 5000 })[0].includes("גבוה"));
  assert.ok(validateManualFood({ name: "x", calories: 100, fat: 300 })[0].includes("שומן"));
  // An omitted macro is allowed; a nonsensical one is not.
  assert.deepEqual(validateManualFood({ name: "x", calories: 100, protein: "" }), []);
});

test("the same barcode always maps to the same food id", () => {
  assert.equal(scannedFoodId("7290000066318"), "barcode-7290000066318");
});

test("the migration keeps the catalogue closed and the provenance honest", async () => {
  const sql = await source("supabase/migrations/202608100002_scanned_foods.sql");

  assert.match(sql, /check \(source is null or source in \('start','openfoodfacts','manual'\)\)/);
  assert.match(sql, /update public\.foods set source = 'start' where source is null/);
  // One row per barcode.
  assert.match(sql, /create unique index if not exists foods_barcode_unique_idx[\s\S]*where barcode is not null/);

  // No blanket insert policy is granted on foods; contributions go through the
  // function, which fixes the id and the provenance.
  assert.doesNotMatch(sql, /create policy[\s\S]*on public\.foods for insert/);
  assert.match(sql, /security definer/);
  assert.match(sql, /if p_source not in \('openfoodfacts','manual'\)/);

  // A curated row is never overwritten by a community one.
  assert.match(sql, /case when source = 'start' then name else trim\(p_name\) end/);

  // The same bounds the client checks, enforced where it counts.
  assert.match(sql, /p_calories > 900/);
  assert.match(sql, /grant execute on function public\.upsert_scanned_food[\s\S]*to authenticated/);
});

test("the action decides provenance itself rather than trusting the form", async () => {
  const action = await source("app/actions/scanned-food.ts");
  assert.match(action, /p_source: manual \? "manual" : "openfoodfacts"/);
  assert.match(action, /validateManualFood/);
  assert.match(action, /if \(!auth\) return \{ ok: false/);
});

test("the lookup prefers START's own catalogue and survives a slow community API", async () => {
  const route = await source("app/api/foods/barcode/[barcode]/route.ts");
  assert.match(route, /from\("foods"\)[\s\S]*\.eq\("barcode", barcode\)/);
  assert.match(route, /AbortController/);
  assert.match(route, /OFF_TIMEOUT_MS/);
  assert.match(route, /lookup_unavailable/);
  assert.match(route, /if \(!auth\) return NextResponse\.json\(\{ error: "unauthorized" \}/);
  // Once OFF resolves a valid product it becomes shared catalogue data. The
  // database function normalizes and de-duplicates the barcode.
  assert.match(route, /rpc\("upsert_scanned_food"/);
  assert.match(route, /p_source:"openfoodfacts"/);
  assert.match(route, /catalog_save_failed/);
});
