// Builds the migration for the rest of Aroma's menu from the per-serving figures
// published on aroma.co.il (the "מנה" column), one food category per Aroma
// category. Same rules as the pastries (generate-aroma-pastries-migration.mjs):
// weight or volume to a whole number, calories and macros to the nearest whole.
//
//   node scripts/generate-aroma-menu-migration.mjs <aroma-menu.json> <first-id>
//
// Each row: [aroma category slug, title, "210 מ״ל" | "388 גרם", kcal, protein,
// carbs, fat, sugars, sodium]. Items Aroma publishes no figures for are left out
// of the JSON rather than entered as zero.

import { readFileSync } from "node:fs";

const [file, firstIdArg] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(file, "utf8"));
let id = Number(firstIdArg);

const CATEGORIES = {
  "משקאות-חמים": ["משקאות חמים ארומה", "כוס"],
  "כריכים": ["כריכים ארומה", "יחידה"],
  "סלטים": ["סלטים ארומה", "מנה"],
  "ארומה-bowls": ["BOWLS ארומה", "מנה"],
  "ארוחות-בוקר": ["ארוחות בוקר ארומה", "מנה"],
  "מיצים-סחוטים-במקום": ["מיצים סחוטים ארומה", "כוס"],
  "טוסטים": ["טוסטים ארומה", "יחידה"],
  "אייסים-וגלידה": ["אייסים וקפה קר ארומה", "כוס"],
  "משקאות-קרים": ["משקאות קרים ארומה", "כוס"],
  "שייקים-ומילקשייקים": ["שייקים ארומה", "כוס"],
};

const per100 = (value, amount) => Math.round((value / amount) * 100 * 1000) / 1000;
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

const values = rows.map(([slug, title, serving, kcal, protein, carbs, fat, sugars, sodium]) => {
  const [category, unit] = CATEGORIES[slug];
  const [, rawAmount, measure] = serving.match(/^([\d.]+) (.+)$/);
  const amount = Math.round(Number(rawAmount));
  const calories = Math.round(kcal);
  const p = Math.round(protein);
  const c = Math.round(carbs);
  const f = Math.round(fat);
  // "קפה ארומה", "סלט ארומה" already say whose they are.
  const name = `${title.includes("ארומה") ? title : `${title} ארומה`} (${amount} ${measure})`;
  const notes = `לפי אתר ארומה, מנה = ${serving}: ${kcal} קלוריות, ${protein} גרם חלבון, ${carbs} גרם פחמימות, ${fat} גרם שומן. מעוגל: ${calories} קלוריות, ${p} חלבון, ${c} פחמימות, ${f} שומן.`;
  return `  (${q(String(id++))}, ${q(name)}, 'ארומה', ${q(category)}, ${per100(calories, amount)}, ${per100(p, amount)}, ${per100(c, amount)}, ${per100(f, amount)}, ${per100(Math.round(sugars ?? 0), amount)}, ${per100(Math.round(sodium ?? 0), amount)}, 1, ${q(unit)}, ${q(`${unit} (${amount} ${measure})`)}, 'מאושר', ${q(notes)}, ${q(`https://www.aroma.co.il/food_categories/${encodeURIComponent(slug).toLowerCase()}/`)}, ${amount}, ${calories}, 1)`;
});

const categories = [...new Set(rows.map(([slug]) => CATEGORIES[slug][0]))];

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
  if (select count(*) from public.foods where brand = 'ארומה' and category in (${categories.map(q).join(", ")})) <> ${rows.length} then
    raise exception 'aroma_menu_upsert_failed';
  end if;
end $$;

commit;`);
