begin;

update public.foods
set package_unit = null,
    serving_label = 'ל-100 גרם',
    unit_weight_grams = null,
    calories_per_unit = null,
    units_per_package = null,
    notes = case id
      when 'walnuts' then 'ערכים ל-100 גרם שנמסרו על ידי המשתמש; סיבים תזונתיים: כ-6.7 גרם.'
      when 'roasted-salted-almonds' then 'ערכים ל-100 גרם שנמסרו על ידי המשתמש; שומן רווי: 4 גרם; סיבים תזונתיים: כ-3.5 גרם.'
    end,
    updated_at = now()
where id in ('walnuts', 'roasted-salted-almonds');

do $$
begin
  if exists (
    select 1
    from public.foods
    where id in ('walnuts', 'roasted-salted-almonds')
      and (
        serving_label is distinct from 'ל-100 גרם'
        or package_unit is not null
        or unit_weight_grams is not null
        or calories_per_unit is not null
        or units_per_package is not null
      )
  ) then
    raise exception 'nuts_100g_normalization_failed';
  end if;

  if (select count(*) from public.foods where id in ('walnuts', 'roasted-salted-almonds')) <> 2 then
    raise exception 'nuts_100g_rows_missing';
  end if;
end $$;

commit;
