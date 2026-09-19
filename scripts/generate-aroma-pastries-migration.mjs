// Builds the Aroma pastries migration from the per-serving figures published on
// aroma.co.il (the "מנה" column, not the per-100 g one).
//
//   node scripts/generate-aroma-pastries-migration.mjs <aroma.json> <first-id>
//
// Rounding, as Eli asked: the serving weight to a whole gram (whole weights stay
// as published), calories up to the next ten, macros to whole grams. The rounded
// serving values are what the card shows; the per-100 g columns are derived back
// from them so the unit arithmetic reproduces exactly those numbers.

import { readFileSync } from "node:fs";

const [file, firstIdArg] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(file, "utf8"));
let id = Number(firstIdArg);

const roundWeight = (g) => Math.round(g);
const per100 = (value, grams) => Math.round((value / grams) * 100 * 1000) / 1000;
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const slug = (name) => encodeURIComponent(name.replaceAll(" ", "-")).toLowerCase();

const values = rows.map(([title, serving, kcal, protein, carbs, fat, sugars, sodium]) => {
  const grams = roundWeight(Number(serving));
  const calories = Math.ceil(Number(kcal) / 10) * 10;
  const p = Math.round(Number(protein));
  const c = Math.round(Number(carbs));
  const f = Math.round(Number(fat));
  const name = `${title} ארומה (${grams} גרם)`;
  const notes = `לפי אתר ארומה, מנה = ${serving} גרם: ${kcal} קלוריות, ${protein} גרם חלבון, ${carbs} גרם פחמימות, ${fat} גרם שומן. מעוגל: ${calories} קלוריות, ${p} חלבון, ${c} פחמימות, ${f} שומן ל-${grams} גרם.`;
  return `  (${q(String(id++))}, ${q(name)}, 'ארומה', 'מאפים ארומה', ${per100(calories, grams)}, ${per100(p, grams)}, ${per100(c, grams)}, ${per100(f, grams)}, ${per100(Math.round(Number(sugars)), grams)}, ${per100(Math.round(Number(sodium)), grams)}, 1, 'יחידה', ${q(`יחידה (${grams} גרם)`)}, 'מאושר', ${q(notes)}, ${q(`https://www.aroma.co.il/food/${slug(title)}/`)}, ${grams}, ${calories}, 1)`;
});

console.log(`begin;

insert into public.foods (
  id, name, brand, category, calories, protein, carbs, fat, sugars,
  sodium_mg, package_quantity, package_unit, serving_label,
  verification_status, notes, source_url, unit_weight_grams,
  calories_per_unit, units_per_package
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
  sugars = excluded.sugars,
  sodium_mg = excluded.sodium_mg,
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
  if (select count(*) from public.foods where category = 'מאפים ארומה') <> ${rows.length} then
    raise exception 'aroma_pastries_upsert_failed';
  end if;
end $$;

commit;`);
