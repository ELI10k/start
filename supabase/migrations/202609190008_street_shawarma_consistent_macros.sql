-- Fuder's figures for the two shawarma servings do not add up: 43 g protein,
-- 240 g carbs and 139 g fat is about 2,400 calories, not the 1,158 listed.
-- Eli's call: round the calories up (1,158 -> 1,200, 817 -> 900), keep Fuder's
-- protein, and set carbs and fat so the four figures agree (4/4/9 kcal per g).
-- Rows are one מנה of a nominal 100 g, so the stored values are the serving's.
begin;

update public.foods set
  calories = 1200, protein = 43, carbs = 115, fat = 63, calories_per_unit = 1200,
  notes = 'לפי Fuder 1158 קלוריות, אך המאקרו שם (43/240/139) לא מתיישב. מעוגל ל-1200 קלוריות; פחמימות ושומן הותאמו כך ש-43 חלבון, 115 פחמימות ו-63 שומן נותנים 1200.',
  updated_at = now()
where id = '686' and name = 'שווארמה בלאפה (מנה)';

update public.foods set
  calories = 900, protein = 30, carbs = 80, fat = 51, calories_per_unit = 900,
  notes = 'לפי Fuder 817 קלוריות, אך המאקרו שם (30/169/98) לא מתיישב. מעוגל ל-900 קלוריות; פחמימות ושומן הותאמו כך ש-30 חלבון, 80 פחמימות ו-51 שומן נותנים 900.',
  updated_at = now()
where id = '687' and name = 'שווארמה בפיתה (מנה)';

do $$
begin
  if (select count(*) from public.foods
      where (id = '686' and calories = 1200 and carbs = 115)
         or (id = '687' and calories = 900 and carbs = 80)) <> 2 then
    raise exception 'shawarma_update_failed';
  end if;
end $$;

commit;
