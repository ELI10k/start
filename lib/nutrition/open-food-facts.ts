// Open Food Facts is a community database: fields are frequently missing, often
// in the wrong unit, and occasionally nonsense. Everything here is about deciding
// what is trustworthy enough to show a person, and refusing the rest rather than
// guessing.

export type FoodSource = "start" | "openfoodfacts" | "manual";

export type ScannedFood = Readonly<{
  barcode: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  packageUnit: string | null;
  unitWeightGrams: number | null;
  // Always per 100g/100ml, which is the only basis OFF reports consistently.
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: FoodSource;
  sourceUrl: string | null;
}>;

// EAN-8, UPC-A and EAN-13. Anything else is not a product barcode.
const BARCODE = /^[0-9]{8}$|^[0-9]{12,13}$/;

export function normalizeBarcode(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!BARCODE.test(digits)) return null;
  // A 12-digit UPC-A is the same product as the 13-digit EAN with a leading zero.
  return digits.length === 12 ? `0${digits}` : digits;
}

// Bounds that separate a plausible food from a unit error. Nothing edible is
// above 900 kcal/100g - pure fat is 900 - so anything higher is a mis-parse.
const LIMITS = { calories: 900, protein: 100, carbs: 100, fat: 100 } as const;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function bounded(value: number | null, limit: number): number | null {
  if (value === null) return null;
  return value > limit ? null : Number(value.toFixed(2));
}

type OpenFoodFactsProduct = Readonly<{
  product_name?: string;
  product_name_he?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  product_quantity?: string | number;
  nutriments?: Record<string, unknown>;
}>;

/**
 * Turns an Open Food Facts product into something worth showing, or null.
 *
 * Returns null when the product has no usable name or no energy value: a food
 * with no calories is not a food the app can log, and inventing a zero would
 * quietly corrupt the day's total.
 */
export function parseOpenFoodFactsProduct(barcode: string, product: OpenFoodFactsProduct | null | undefined): ScannedFood | null {
  if (!product) return null;
  const code = normalizeBarcode(barcode);
  if (!code) return null;

  const name = [product.product_name_he, product.product_name, product.generic_name]
    .map((value) => String(value ?? "").trim())
    .find((value) => value.length > 0);
  if (!name) return null;

  const nutriments = product.nutriments ?? {};
  // OFF reports energy in kJ under one key and kcal under another; prefer kcal
  // and convert only when that is all there is.
  const kcal = toNumber(nutriments["energy-kcal_100g"]);
  const kj = toNumber(nutriments["energy-kj_100g"] ?? nutriments["energy_100g"]);
  const calories = bounded(kcal ?? (kj === null ? null : kj / 4.184), LIMITS.calories);
  if (calories === null) return null;

  const brand = String(product.brands ?? "").split(",")[0]?.trim() || null;
  const packageGrams = toNumber(product.product_quantity);

  return {
    barcode: code,
    name,
    brand,
    servingLabel: String(product.serving_size ?? product.quantity ?? "").trim() || "100 גרם",
    packageUnit: "גרם",
    unitWeightGrams: packageGrams && packageGrams > 0 ? packageGrams : null,
    calories,
    protein: bounded(toNumber(nutriments["proteins_100g"]), LIMITS.protein),
    carbs: bounded(toNumber(nutriments["carbohydrates_100g"]), LIMITS.carbs),
    fat: bounded(toNumber(nutriments["fat_100g"]), LIMITS.fat),
    source: "openfoodfacts",
    sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
  };
}

/** Validates a food a person typed in by hand. Returns the problems, not a boolean. */
export function validateManualFood(input: {
  name?: string;
  barcode?: string;
  calories?: string | number;
  protein?: string | number;
  carbs?: string | number;
  fat?: string | number;
}): readonly string[] {
  const problems: string[] = [];

  if (!String(input.name ?? "").trim()) problems.push("יש להזין שם מזון.");

  if (input.barcode && normalizeBarcode(String(input.barcode)) === null) {
    problems.push("הברקוד אינו תקין. ברקוד מוצר הוא 8, 12 או 13 ספרות.");
  }

  const calories = toNumber(input.calories);
  if (calories === null) problems.push("יש להזין קלוריות ל-100 גרם.");
  else if (calories > LIMITS.calories) problems.push("ערך הקלוריות גבוה מהאפשרי ל-100 גרם.");

  for (const [key, label, limit] of [
    ["protein", "חלבון", LIMITS.protein],
    ["carbs", "פחמימות", LIMITS.carbs],
    ["fat", "שומן", LIMITS.fat],
  ] as const) {
    const raw = input[key];
    if (raw === undefined || raw === "") continue;
    const value = toNumber(raw);
    if (value === null) problems.push(`ערך ${label} אינו תקין.`);
    else if (value > limit) problems.push(`ערך ${label} גבוה מ-${limit} גרם ל-100 גרם.`);
  }

  return problems;
}

/** A stable id for a scanned food, so re-scanning the same barcode reuses the row. */
export function scannedFoodId(barcode: string): string {
  return `barcode-${barcode}`;
}
