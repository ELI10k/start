import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../data/foods.json", import.meta.url);
const target = new URL(
  "../supabase/migrations/202607200008_food_catalog.sql",
  import.meta.url,
);
const foods = JSON.parse(await readFile(source, "utf8"));
if (foods.length !== 336) {
  throw new Error(`Expected 336 foods, received ${foods.length}.`);
}
if (new Set(foods.map((food) => food.id)).size !== foods.length) {
  throw new Error("Food IDs must be unique before generating the migration.");
}

const text = (value) =>
  value === undefined || value === null
    ? "null"
    : `'${String(value).replaceAll("'", "''")}'`;
const number = (value) =>
  value === undefined || value === null ? "null" : String(value);
const row = (food) =>
  `(${[
    text(food.id),
    text(food.name),
    text(food.brand),
    text(food.category),
    number(food.calories),
    number(food.protein),
    number(food.carbs),
    number(food.fat),
    number(food.sugars),
    number(food.sodiumMg),
    number(food.calciumMg),
    number(food.packageQuantity),
    text(food.packageUnit),
    text(food.barcode),
    text(food.servingLabel),
    text(food.verificationStatus),
    text(food.notes),
    text(food.sourceUrl),
    number(food.unitWeightGrams),
    number(food.caloriesPerUnit),
    number(food.unitsPerPackage),
  ].join(",")})`;

const columns = [
  "id",
  "name",
  "brand",
  "category",
  "calories",
  "protein",
  "carbs",
  "fat",
  "sugars",
  "sodium_mg",
  "calcium_mg",
  "package_quantity",
  "package_unit",
  "barcode",
  "serving_label",
  "verification_status",
  "notes",
  "source_url",
  "unit_weight_grams",
  "calories_per_unit",
  "units_per_package",
];
const mutable = columns.filter((column) => column !== "id");
const sql = `begin;

insert into public.foods(${columns.join(",")}) values
${foods.map(row).join(",\n")}
on conflict(id) do update set
${mutable.map((column) => `  ${column} = excluded.${column}`).join(",\n")};

do $$
declare
  v_total integer;
  v_unique_ids integer;
  v_unique_products integer;
begin
  select count(*), count(distinct id), count(distinct (lower(trim(name)), lower(trim(coalesce(brand,'')))))
    into v_total, v_unique_ids, v_unique_products
  from public.foods;
  if v_total <> 336 or v_unique_ids <> 336 or v_unique_products <> 336 then
    raise exception 'food_catalog_verification_failed: total=%, ids=%, products=%', v_total, v_unique_ids, v_unique_products;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
`;

await writeFile(target, sql);
console.log(`Generated ${foods.length} food rows at ${target.pathname}`);
