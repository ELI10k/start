// Adds the two things the catalogue was missing: the coach's own portion list,
// and produce.
//
// data/foods.json already holds the 336 branded products from
// "מאגר_מזונות_בלוק_01" - that import ran and is not repeated here. What it never
// had was vegetables (one entry, avocado) or the portions the coach actually
// writes menus in: "כפית שמן", "פרוסה גבינה צהובה 9%", "1 קופסת טונה במים".
//
//   node scripts/import-coach-foods.mjs [--sql <path>]
//
// Merges into data/foods.json, keyed by a normalised name so a second run
// updates rather than duplicates, and writes an idempotent upsert to --sql.

import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";
import XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const sqlArg = args[args.indexOf("--sql") + 1];
const sqlPath = args.includes("--sql") && sqlArg ? (isAbsolute(sqlArg) ? sqlArg : join(root, sqlArg)) : null;

const COACH_WORKBOOK = "/Users/lykhn/Downloads/קלוריות מאכלים אלי.xlsx";

const number = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
// Hebrew names arrive with stray spaces, geresh variants and double spaces.
const normalise = (name) => String(name ?? "").replace(/[׳'׳`]/g, "׳").replace(/\s+/g, " ").trim();
const key = (name) => normalise(name).toLocaleLowerCase("he");

// Produce, per 100 g raw. Standard reference values - nothing here is brand
// specific, which is why none of it appeared in a workbook of branded products.
const VEGETABLES = [
  ["עגבנייה", 18, 0.9, 3.9, 0.2], ["עגבניות שרי", 18, 0.9, 3.9, 0.2], ["מלפפון", 15, 0.7, 3.6, 0.1],
  ["גזר", 41, 0.9, 9.6, 0.2], ["בצל", 40, 1.1, 9.3, 0.1], ["בצל ירוק", 32, 1.8, 7.3, 0.2],
  ["פלפל אדום", 31, 1, 6, 0.3], ["פלפל צהוב", 27, 1, 6.3, 0.2], ["פלפל ירוק", 20, 0.9, 4.6, 0.2],
  ["חסה", 15, 1.4, 2.9, 0.2], ["כרוב לבן", 25, 1.3, 5.8, 0.1], ["כרוב סגול", 31, 1.4, 7.4, 0.2],
  ["ברוקולי", 34, 2.8, 6.6, 0.4], ["כרובית", 25, 1.9, 5, 0.3], ["קישוא", 17, 1.2, 3.1, 0.3],
  ["חציל", 25, 1, 5.9, 0.2], ["תרד", 23, 2.9, 3.6, 0.4], ["סלרי", 16, 0.7, 3, 0.2],
  ["שומר", 31, 1.2, 7.3, 0.2], ["פטריות שמפיניון", 22, 3.1, 3.3, 0.3], ["שעועית ירוקה", 31, 1.8, 7, 0.1],
  ["אפונה ירוקה", 81, 5.4, 14.5, 0.4], ["תירס", 86, 3.3, 19, 1.4], ["צנון", 16, 0.7, 3.4, 0.1],
  ["לפת", 28, 0.9, 6.4, 0.1], ["דלעת", 26, 1, 6.5, 0.1], ["דלורית", 45, 1, 12, 0.1],
  ["בטטה", 86, 1.6, 20, 0.1], ["תפוח אדמה", 77, 2, 17, 0.1], ["ארטישוק", 47, 3.3, 10.5, 0.2],
  ["אספרגוס", 20, 2.2, 3.9, 0.1], ["כרישה", 61, 1.5, 14, 0.3], ["סלק", 43, 1.6, 9.6, 0.2],
  ["כרוב ניצנים", 43, 3.4, 9, 0.3], ["נבטי אלפלפא", 23, 4, 2.1, 0.7], ["רוקט", 25, 2.6, 3.7, 0.7],
  ["פטרוזיליה", 36, 3, 6.3, 0.8], ["כוסברה", 23, 2.1, 3.7, 0.5], ["שמיר", 43, 3.5, 7, 1.1],
  ["בזיליקום", 23, 3.2, 2.6, 0.6], ["נענע", 44, 3.3, 8.4, 0.7], ["שום", 149, 6.4, 33, 0.5],
  ["זנגביל", 80, 1.8, 18, 0.8], ["קולרבי", 27, 1.7, 6.2, 0.1], ["במיה", 33, 1.9, 7.5, 0.2],
  ["חסה ערבית", 15, 1.4, 2.9, 0.2], ["עלי מנגולד", 19, 1.8, 3.7, 0.2], ["כרפס", 16, 0.7, 3, 0.2],
];

const FRUITS = [
  ["תפוח", 52, 0.3, 14, 0.2], ["בננה", 89, 1.1, 23, 0.3], ["אגס", 57, 0.4, 15, 0.1],
  ["תפוז", 47, 0.9, 12, 0.1], ["קלמנטינה", 53, 0.8, 13, 0.3], ["אשכולית", 42, 0.8, 11, 0.1],
  ["לימון", 29, 1.1, 9, 0.3], ["אבטיח", 30, 0.6, 7.6, 0.2], ["מלון", 34, 0.8, 8, 0.2],
  ["ענבים", 69, 0.7, 18, 0.2], ["תות שדה", 32, 0.7, 7.7, 0.3], ["אוכמניות", 57, 0.7, 14, 0.3],
  ["אפרסק", 39, 0.9, 10, 0.3], ["נקטרינה", 44, 1.1, 11, 0.3], ["שזיף", 46, 0.7, 11, 0.3],
  ["משמש", 48, 1.4, 11, 0.4], ["דובדבנים", 63, 1.1, 16, 0.2], ["קיווי", 61, 1.1, 15, 0.5],
  ["מנגו", 60, 0.8, 15, 0.4], ["אננס", 50, 0.5, 13, 0.1], ["רימון", 83, 1.7, 19, 1.2],
  ["תמר מג׳הול", 277, 1.8, 75, 0.2], ["תאנה", 74, 0.8, 19, 0.3], ["אפרסמון", 70, 0.6, 18, 0.2],
  ["פפאיה", 43, 0.5, 11, 0.3], ["ליצ׳י", 66, 0.8, 17, 0.4], ["שסק", 47, 0.4, 12, 0.2],
  ["פומלה", 38, 0.8, 9.6, 0], ["אבוקדו", 160, 2, 8.5, 15],
];

// The alternatives the coach dictates by name and the workbook never listed, so
// "הוספת חלופה" can offer the full dairy and meat lists.
const COACH_ALTERNATIVES = [
  ["דג מושט", "בשרים / דגים", 128, 26, 0, 2.7, null],
  ["משקה פרו יטבתה 350 מ״ל", "גבינות", 140, 25, 8, 1, "בקבוק"],
  ["יוגורט חלבון 20-25 גרם חלבון עד 150 קלוריות", "גבינות", 150, 22, 8, 2, "גביע"],
  ["גבינה לבנה עד 5%", "גבינות", 100, 14, 4, 4, null],
];

// The sheet groups rows under a category cell that is filled once per block.
// Header repeats and the averaging rows are not foods.
const isNoise = (name) => !name
  || /^מוצר\b/.test(name)
  || name.includes("קלוריות")
  || name.includes("ממוצע");

// Whether a row is a portion or a per-100 g figure, and if a portion, of what.
//
// It matters because portionFor() reads every food as per-100 g: a bottle of
// Yotvata Pro entered as 140 kcal came out as 70 kcal for "50 גרם". A food is a
// countable unit only when it carries both a unit noun and the weight of one, so
// a portion row is given unit_weight_grams = 100 - one unit then reproduces the
// numbers the coach wrote, exactly.
const UNIT_WORDS = [
  ["כפית", /כפית/], ["כף", /\bכף\b/], ["פרוסה", /פרוס(ה|ות|ת)/], ["פיתה", /פית(ה|ות)/],
  ["לחמנייה", /לחמני(ה|יה|ות)/], ["פרכית", /פרכי(ת|ות)/], ["קופסה", /קופס(ה|ת|אות)/],
  ["כוס", /\bכוס\b/], ["גביע", /גביע/], ["בקבוק", /בקבוק/], ["ביצה", /ביצ(ה|ים)|לבן ביצה/],
  ["תמר", /\bתמר\b/], ["יחידה", /יחיד(ה|ות)/],
];
// "קוטג׳ 1% 250 גרם" and "אגוזים 10 גרם" state a weight: the figures belong to
// that weight, so they are scaled to 100 g rather than left to be read as such.
const WEIGHT_IN_NAME = /(\d+(?:\.\d+)?)\s*(?:גרם|גר׳|ג׳)/;

function portionShape(name, category) {
  if (category === "כריכים") return { unit: "מנה" };
  for (const [unit, pattern] of UNIT_WORDS) if (pattern.test(name)) return { unit };
  const weight = name.match(WEIGHT_IN_NAME);
  if (weight) {
    const grams = Number(weight[1]);
    if (grams > 0 && grams !== 100) return { scaleFrom: grams };
  }
  return {};
}

// The coach's portion table is already in the catalogue: migration
// 202608020001 imported all of it as curated master foods, per 100 g with the
// weight of one portion attached. Re-importing the same sheet produced a second
// "כפית שמן" and 47 other twins. The names in that migration are the skip list.
function curatedMasterNames() {
  const sql = readFileSync(new URL("../supabase/migrations/202608020001_curated_master_foods.sql", import.meta.url), "utf8");
  return new Set([...sql.matchAll(/\('master-[pcf]-\d+',\s*'((?:[^']|'')+)'/g)].map((match) => key(match[1].replaceAll("''", "'"))));
}

function readCoachPortions() {
  const workbook = XLSX.readFile(COACH_WORKBOOK);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["קלוריות מאכלים"], { defval: null });
  const curated = curatedMasterNames();
  const foods = [];
  let category = null;
  for (const row of rows) {
    if (row["חלבונים"]) category = normalise(row["חלבונים"]);
    const name = normalise(row["מוצר "]);
    const calories = number(row["קלוריות"]);
    if (isNoise(name) || calories === null || curated.has(key(name))) continue;
    const shape = portionShape(name, category ?? "");
    const factor = shape.scaleFrom ? 100 / shape.scaleFrom : 1;
    const scale = (value) => value === null ? null : Math.round(value * factor * 10) / 10;
    foods.push({
      name,
      category: category ?? "מנות המאמן",
      calories: scale(calories),
      protein: scale(number(row["חלבון"])),
      carbs: scale(number(row["פחמימה"])),
      fat: scale(number(row["שומן"])),
      packageUnit: shape.unit ?? null,
      unitWeightGrams: shape.unit ? 100 : null,
      servingLabel: shape.unit ? `ל${shape.unit}` : "ל-100 גרם",
      notes: "מרשימת המנות של המאמן",
    });
  }
  return foods;
}

const produce = (rows, category) => rows.map(([name, calories, protein, carbs, fat]) => ({
  name, category, calories, protein, carbs, fat, packageUnit: null, unitWeightGrams: null, servingLabel: "ל-100 גרם", notes: null,
}));

const catalogue = JSON.parse(await readFile(join(root, "data/foods.json"), "utf8"));
const byKey = new Map(catalogue.map((food) => [key(food.name), food]));

const additions = [
  ...produce(VEGETABLES, "ירקות"),
  ...produce(FRUITS, "פירות"),
  ...readCoachPortions(),
  ...COACH_ALTERNATIVES.map(([name, category, calories, protein, carbs, fat, unit]) =>
    ({ name, category, calories, protein, carbs, fat, packageUnit: unit, unitWeightGrams: unit ? 100 : null,
       servingLabel: unit ? `ל${unit}` : "ל-100 גרם", notes: "מרשימת החלופות של המאמן" })),
];

let added = 0;
let updated = 0;
const written = [];
for (const [index, food] of additions.entries()) {
  const existing = byKey.get(key(food.name));
  const id = existing?.id ?? `coach-${String(index + 1).padStart(3, "0")}`;
  const row = {
    id,
    name: normalise(food.name),
    brand: existing?.brand,
    category: food.category,
    calories: food.calories,
    protein: food.protein ?? undefined,
    carbs: food.carbs ?? undefined,
    fat: food.fat ?? undefined,
    packageUnit: food.packageUnit ?? undefined,
    unitWeightGrams: food.unitWeightGrams ?? undefined,
    servingLabel: food.servingLabel,
    verificationStatus: "מאושר",
    notes: food.notes ?? undefined,
  };
  if (existing) { Object.assign(existing, row); updated += 1; }
  else { catalogue.push(row); byKey.set(key(row.name), row); added += 1; }
  written.push(row);
}

// The existing order is left alone - additions go on the end. Sorting the file
// renumbered nothing but did move foods[0], which several tests read directly.
await writeFile(join(root, "data/foods.json"), `${JSON.stringify(catalogue, null, 2)}\n`, "utf8");

if (sqlPath) {
  const quote = (value) => value === undefined || value === null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
  const num = (value) => value === undefined || value === null ? "null" : String(value);
  const values = written.map((row) =>
    `(${quote(row.id)},${quote(row.name)},${quote(row.brand)},${quote(row.category)},${num(row.calories)},${num(row.protein)},${num(row.carbs)},${num(row.fat)},${quote(row.packageUnit)},${num(row.unitWeightGrams)},${quote(row.servingLabel)},${quote(row.verificationStatus)},${quote(row.notes)})`);
  await writeFile(sqlPath, [
    "begin;",
    "insert into public.foods (id,name,brand,category,calories,protein,carbs,fat,package_unit,unit_weight_grams,serving_label,verification_status,notes) values",
    `${values.join(",\n")}`,
    "on conflict (id) do update set name=excluded.name,category=excluded.category,calories=excluded.calories,protein=excluded.protein,carbs=excluded.carbs,fat=excluded.fat,package_unit=excluded.package_unit,unit_weight_grams=excluded.unit_weight_grams,serving_label=excluded.serving_label,verification_status=excluded.verification_status,notes=excluded.notes,updated_at=now();",
    "select count(*) as foods from public.foods;",
    "commit;",
    "",
  ].join("\n"), "utf8");
}

console.log(JSON.stringify({ added, updated, catalogue: catalogue.length, sql: sqlPath }, null, 2));
