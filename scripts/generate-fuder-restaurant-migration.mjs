// Builds a restaurant's food rows from fuder.co.il item pages, using the
// per-serving columns rather than the per-100 g one.
//
//   node scripts/generate-fuder-restaurant-migration.mjs <parsed.json> <brand> <first-id>
//
// parsed.json is [{ u, title, head: [label, "ב-100 גרם", "מנה (325 גרם)", ...],
// rows: [[label, per100, serving1, ...], ...] }], the energy/protein/carbs/fat
// rows in that order. An item sold in several sizes becomes one row per size.
// Items the site gives only per-100 g figures for, and servings of 0 or 1
// calories, are skipped. Rounding as for
// Aroma: the serving to a whole number, calories and macros to the nearest one.

import { readFileSync } from "node:fs";

const [file, brand, firstIdArg] = process.argv.slice(2);
const items = JSON.parse(readFileSync(file, "utf8"));
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
  const base = item.title.replace(/,\s*מקדונלדס$/, "").trim();
  const sizes = item.head.slice(2);
  for (const [index, head] of sizes.entries()) {
    const match = head.match(/^(.*?)\s*\(\s*([\d.]+)\s*(גרם|מ"ל|מ״ל)\s*\)/);
    if (!match) throw new Error(`unreadable serving "${head}" for ${item.title}`);
    const [, label, rawAmount, measure] = match;
    const drink = measure !== "גרם";
    const unit = drink ? "מ״ל" : "גרם";
    const amount = Math.round(Number(rawAmount));
    const [kcal, protein, carbs, fat] = item.rows.slice(0, 4).map((row) => figure(row[index + 2]));
    const calories = Math.round(kcal);
    // Espresso, water, diet soda: nothing to count, and Eli asked for them out.
    if (calories <= 1) continue;
    const [p, c, f] = [protein, carbs, fat].map(Math.round);
    // One size: the item's own name. Several: the name before any " – " gloss,
    // then the size as the site words it ("קטן", "כוס גדולה", "9 נאגטס").
    const title = sizes.length === 1 ? base : `${base.split(" – ")[0]} ${label.replace(/^מנה\s*-\s*/, "")}`;
    const name = `${title} ${brand} (${amount} ${unit})`;
    const packageUnit = packageUnitFor(label, drink);
    const notes = `לפי Fuder, ${head}: ${kcal} קלוריות, ${protein} גרם חלבון, ${carbs} גרם פחמימות, ${fat} גרם שומן.`;
    values.push(`  (${q(String(id++))}, ${q(name)}, ${q(brand)}, ${q(brand)}, ${per100(calories, amount)}, ${per100(p, amount)}, ${per100(c, amount)}, ${per100(f, amount)}, 1, ${q(packageUnit)}, ${q(`${packageUnit} (${amount} ${unit})`)}, 'מאושר', ${q(notes)}, ${q(item.u)}, ${amount}, ${calories}, 1)`);
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
  if (select count(*) from public.foods where category = ${q(brand)}) <> ${values.length} then
    raise exception 'fuder_restaurant_upsert_failed';
  end if;
end $$;

commit;`);
