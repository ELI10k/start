begin;

-- 202609160002_iherb_barbecue_protein_snack originally reused food id 342,
-- which already belongs to this Danone product. Some databases may have run
-- that version before the filename collision was discovered. Restore the
-- canonical catalogue row idempotently; the iHerb product now has its own text
-- id in 202609160004.
insert into public.foods (
  id,name,brand,category,calories,protein,carbs,fat,sugars,sodium_mg,calcium_mg,
  package_quantity,package_unit,barcode,serving_label,verification_status,notes,
  source_url,unit_weight_grams,calories_per_unit,units_per_package
) values (
  '342','דנונה PRO יוגורט שכבות בטעם מנגו 20 גר׳ חלבון 0% שומן','דנונה','יוגורט חלבון',
  56,9.3,3.9,0,3.6,40,90,215,'גביע',null,'גביע 215 גרם','מאושר',
  'ערכים ל-100 גרם לפי דנונה; סה״כ לגביע: 120.4 קלוריות ו-20 גרם חלבון.',
  'https://danone.strauss-group.com/products/%d7%93%d7%a0%d7%95%d7%a0%d7%94-pro-%d7%99%d7%95%d7%92%d7%95%d7%a8%d7%98-%d7%a9%d7%9b%d7%91%d7%95%d7%aa-%d7%91%d7%98%d7%a2%d7%9d-%d7%9e%d7%a0%d7%92%d7%95-20-%d7%92%d7%a8%d7%b3-%d7%97%d7%9c%d7%91%d7%95/',
  215,120.4,1
)
on conflict(id) do update set
  name=excluded.name,brand=excluded.brand,category=excluded.category,calories=excluded.calories,
  protein=excluded.protein,carbs=excluded.carbs,fat=excluded.fat,sugars=excluded.sugars,
  sodium_mg=excluded.sodium_mg,calcium_mg=excluded.calcium_mg,package_quantity=excluded.package_quantity,
  package_unit=excluded.package_unit,barcode=excluded.barcode,serving_label=excluded.serving_label,
  verification_status=excluded.verification_status,notes=excluded.notes,source_url=excluded.source_url,
  unit_weight_grams=excluded.unit_weight_grams,calories_per_unit=excluded.calories_per_unit,
  units_per_package=excluded.units_per_package,updated_at=now();

do $$
begin
  if not exists(select 1 from public.foods where id='342' and brand='דנונה' and calories_per_unit=120.4) then
    raise exception 'danone_342_repair_failed';
  end if;
  if not exists(select 1 from public.foods where id='iherb-barbecue-protein-snack' and brand='iHerb') then
    raise exception 'iherb_unique_food_missing';
  end if;
end $$;

commit;


