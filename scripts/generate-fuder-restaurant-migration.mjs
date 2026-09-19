// Builds a restaurant's food rows from fuder.co.il item pages, using the
// per-serving columns rather than the per-100 g one.
//
//   node scripts/generate-fuder-restaurant-migration.mjs <parsed.json> <category> <first-id> [options]
//
// Options:
//   --suffix <text>      appended to every name and used as the brand
//                        (defaults to the category; "" for generic foods)
//   --min-calories <n>   drop servings under n calories
//   --per-100            keep items the site gives only per-100 g figures for,
//                        as a "ל-100 גרם" row rather than skipping them
//   --plain-unit         drop a bare "יחידה" size label from the name, so two
//                        sizes read "(90 גרם)" and "(150 גרם)"
//
// A serving with no weight ("מנה") is stored as one מנה of a nominal 100 g, so
// its figures are the serving's and the unit arithmetic still counts one.
//
// parsed.json is [{ u, title, head: [label, "ב-100 גרם", "מנה (325 גרם)", ...],
// rows: [[label, per100, serving1, ...], ...] }], the energy/protein/carbs/fat
// rows in that order. An item sold in several sizes becomes one row per size.
// Items the site gives only per-100 g figures for, and servings of 0 or 1
// calories, are skipped. Rounding as for
// Aroma: the serving to a whole number, calories and macros to the nearest one.

import { readFileSync } from "node:fs";

const [file, category, firstIdArg, ...rest] = process.argv.slice(2);
const option = (name) => { const i = rest.indexOf(name); return i < 0 ? undefined : rest[i + 1]; };
const brand = option("--suffix") ?? category;
const minCalories = Number(option("--min-calories") ?? 0);
const keepPer100 = rest.includes("--per-100");
const plainUnit = rest.includes("--plain-unit");
const items = JSON.parse(readFileSync(file, "utf8"));
const seen = new Set();
let id = Number(firstIdArg);

const per100 = (value, amount) => Math.round((value / amount) * 100 * 1000) / 1000;
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const figure = (s) => Math.max(0, Number(String(s).replace(",", ""))) || 0;
const packageUnitFor = (label, drink) =>
  label.startsWith("מנה") ? "מנה"
    : label.startsWith("בקבוק") ? "בקבוק"
      : drink || label.startsWith("כוס") ? "כוס"
        : "יחידה";

const values = [];
for (const item of items) {
  // "ביג מק, מקדונלדס" -> "ביג מק"; the category or suffix says whose it is.
  const base = item.title.replace(/,\s*[^,]+$/, "").replaceAll("`", "'").trim();
  if (seen.has(base)) continue;
  seen.add(base);
  const per100Only = item.head.length === 2;
  if (per100Only && !keepPer100) continue;
  const sizes = per100Only ? ["ל-100 גרם (100 גרם)"] : item.head.slice(2);
  for (const [index, head] of sizes.entries()) {
    const match = head.match(/^(.*?)\s*\(\s*([\d.]+)\s*(גרם|מ"ל|מ״ל)\s*\)/)
      ?? (head.trim() === "מנה" ? [head, "מנה", "100", "מנה"] : null);
    if (!match) throw new Error(`unreadable serving "${head}" for ${item.title}`);
    const [, label, rawAmount, measure] = match;
    const nominal = measure === "מנה";
    const drink = measure !== "גרם" && !nominal;
    const unit = drink ? "מ״ל" : "גרם";
    const amount = Math.round(Number(rawAmount));
    const [kcal, protein, carbs, fat] = item.rows.slice(0, 4).map((row) => figure(row[per100Only ? 1 : index + 2]));
    const calories = Math.round(kcal);
    if (calories < minCalories) continue;
    // Espresso, water, diet soda: nothing to count, and Eli asked for them out.
    if (calories <= 1) continue;
    const [p, c, f] = [protein, carbs, fat].map(Math.round);
    // One size: the item's own name. Several: the name before any " – " gloss,
    // then the size as the site words it ("קטן", "כוס גדולה", "9 נאגטס").
    const size = label.replace(/^מנה(\s*-\s*|$)/, "").replace(plainUnit ? /^יחידה\s*/ : /^$/, "");
    const title = sizes.length === 1 ? base : `${base.split(" – ")[0]} ${size}`.trim();
    const amountText = nominal ? "מנה" : per100Only ? "100 גרם" : `${amount} ${unit}`;
    const name = `${title}${brand ? ` ${brand}` : ""} (${amountText})`;
    const packageUnit = per100Only ? "גרם" : packageUnitFor(label, drink);
    const servingLabel = nominal ? "מנה" : per100Only ? "ל-100 גרם" : `${packageUnit} (${amount} ${unit})`;
    const notes = `לפי Fuder, ${head}: ${kcal} קלוריות, ${protein} גרם חלבון, ${carbs} גרם פחמימות, ${fat} גרם שומן.`;
    values.push(`  (${q(String(id++))}, ${q(name)}, ${brand ? q(brand) : "null"}, ${q(category)}, ${per100(calories, amount)}, ${per100(p, amount)}, ${per100(c, amount)}, ${per100(f, amount)}, 1, ${q(packageUnit)}, ${q(servingLabel)}, 'מאושר', ${q(notes)}, ${q(item.u)}, ${per100Only ? "null" : amount}, ${calories}, 1)`);
  }
}

console.log(`begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat,
  package_quantity, package_unit, serving_label, verification_status, notes,
  source_url, unit_weight_grams, calories_per_unit, units_per_package
) values
${values.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  package_quantity = excluded.package_quantity,
  package_unit = excluded.package_unit,
  serving_label = excluded.serving_label,
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  source_url = excluded.source_url,
  unit_weight_grams = excluded.unit_weight_grams,
  calories_per_unit = excluded.calories_per_unit,
  units_per_package = excluded.units_per_package,
  updated_at = now();

do $$
begin
  if (select count(*) from public.foods where category = ${q(category)}) <> ${values.length} then
    raise exception 'fuder_restaurant_upsert_failed';
  end if;
end $$;

commit;`);
