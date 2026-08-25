-- Keep an explicit per-unit calorie value wherever a source provides a unit
-- weight. The core nutrition columns remain per 100 g; this column is the
-- audited derived value used by unit-based consumers and future exports.
--
-- Impact: one indexed update over public.foods, data only - no schema change,
-- no policy change, nothing outside this column is read or written.
-- Backward compatible: every consumer already reads calories per 100 g and
-- treats calories_per_unit as optional.
-- Rollback: `update public.foods set calories_per_unit = null where
-- unit_weight_grams is not null;` and re-run the import, which is where the
-- source values come from.

begin;
update public.foods
set calories_per_unit = round(
  case
    when id like 'master-%' or serving_label ~* '100'
      then calories * unit_weight_grams / 100
    else calories
  end,
  3
)
where unit_weight_grams is not null
  and unit_weight_grams > 0
  and (
    calories_per_unit is null
    or abs(calories_per_unit - case
      when id like 'master-%' or serving_label ~* '100'
        then calories * unit_weight_grams / 100
      else calories
    end) > 0.11
  );
commit;
