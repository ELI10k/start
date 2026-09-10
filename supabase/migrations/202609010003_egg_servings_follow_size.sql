-- Eggs are chosen by size, not weighed by the client. Nutrition remains stored
-- per 100 edible grams; the catalogue scales it to one countable unit.
update public.foods
set calories = 143,
    protein = 12.56,
    carbs = 0.72,
    fat = 9.51,
    package_unit = 'ביצה',
    unit_weight_grams = case id
      when 'master-p-004' then 35.5 -- S, edible weight
      when 'master-p-003' then 45.2 -- M, edible weight
      when 'master-p-002' then 54.2 -- L, edible weight
      when 'master-p-001' then 61.3 -- XL, edible weight
    end,
    serving_label = case id
      when 'master-p-004' then '1 ביצה S'
      when 'master-p-003' then '1 ביצה M'
      when 'master-p-002' then '1 ביצה L'
      when 'master-p-001' then '1 ביצה XL'
    end
where id in ('master-p-001', 'master-p-002', 'master-p-003', 'master-p-004');

update public.foods
set serving_label = case id
      when '294' then '1 ביצה קשה S'
      when '295' then '1 ביצה קשה M'
      when '296' then '1 ביצה קשה L'
      when '297' then '1 ביצה קשה XL'
    end,
    package_unit = 'ביצה'
where id in ('294', '295', '296', '297');

update public.foods
set calories = 52,
    protein = 10.9,
    carbs = 0.73,
    fat = 0.17,
    package_unit = 'יחידה',
    unit_weight_grams = 33,
    serving_label = '1 חלבון ביצה'
where id in ('master-p-005', '298');

update public.foods
set package_unit = 'יחידה',
    unit_weight_grams = 17,
    serving_label = '1 חלמון ביצה'
where id = '299';

update public.foods
set package_unit = 'מנה',
    unit_weight_grams = 108.4,
    serving_label = 'מנה: חביתה משתי ביצים L ללא שמן'
where id = '300';

