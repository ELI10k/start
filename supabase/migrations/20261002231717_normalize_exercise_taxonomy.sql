begin;

-- Keep the directory's broad category filter separate from the precise equipment filter.
-- Also fills the 17 legacy equipment gaps and normalizes equivalent equipment names.
with normalized as (
  select
    id,
    name,
    category,
    source_references,
    case
      when equipment is not null and btrim(equipment) <> '' then case equipment
        when 'כבל' then 'כבל פולי'
        when 'כבלים' then 'כבל פולי'
        when 'פולי' then 'כבל פולי'
        when 'מכונה' then 'מכונה ייעודית'
        when 'משקולת' then 'משקולות יד'
        when 'משקולות' then 'משקולות יד'
        else btrim(equipment)
      end
      when name = 'דד ליפט' then 'מוט'
      when name = 'הרחקת רגל לאחור  בכבל תחתון (בעיטות סוס)' then 'כבל פולי'
      when name = 'הרמת רגליים' then 'משקל גוף'
      when name in ('חתירה בהטיית גב במשקולות בודדות','חתירה מעל הספה','פול אובר במשקולת בודדת','פטישים במשקולות בודדות','קיק בק במשקולת בודדת') then 'משקולות יד'
      when name in ('חתירה במכונה','כפיפת רגליים במכונה בישיבה | תרגיל רגליים להמטסרינג','סקוואט בהמר') then 'מכונה ייעודית'
      when name in ('יד אחורית','לחיצות כתף על הריצפה','סומו סקוואט') then 'משקל גוף'
      when name = 'כפיפת מרפקים בכסא כומר' then 'מוט W'
      when name = 'פשיטת ידיים הפוכות במוט' then 'מוט'
      when name = 'קיק בק בפולי תחתון' then 'כבל פולי'
      when concat_ws(' ', name, category) ~ 'משקל גוף' then 'משקל גוף'
      when concat_ws(' ', name, category) ~* 'trx|רצוע(ה|ות) תל(יה|ייה)' then 'רצועות תלייה'
      when concat_ws(' ', name, category) ~ 'כבל|פולי' then 'כבל פולי'
      when concat_ws(' ', name, category) ~ 'מכונ|המר' then 'מכונה ייעודית'
      when concat_ws(' ', name, category) ~ 'קטלבל' then 'קטלבל'
      when concat_ws(' ', name, category) ~ 'משקול' then 'משקולות יד'
      when concat_ws(' ', name, category) ~ 'מוט' then 'מוט'
    end as normalized_equipment,
    case when primary_muscle_group = 'ליבה' then 'שרירי ליבה' else primary_muscle_group end as normalized_primary_muscle,
    array(
      select normalized_muscle
      from (
        select
          case when muscle = 'ליבה' then 'שרירי ליבה' else muscle end as normalized_muscle,
          min(position) as first_position
        from unnest(coalesce(secondary_muscle_groups, '{}'::text[])) with ordinality as muscles(muscle, position)
        group by case when muscle = 'ליבה' then 'שרירי ליבה' else muscle end
      ) ordered_muscles
      order by first_position
    ) as normalized_secondary_muscles
  from public.workout_exercises
), classified as (
  select
    *,
    case
      when concat_ws(' ', id, name, category, normalized_equipment, source_references::text) ~* 'trx|רצוע(ה|ות) תל(יה|ייה)' then 'TRX'
      when category = 'משקל גוף'
        or normalized_equipment = 'משקל גוף'
        or id like 'bodyweight-%'
        or source_references::text ~ 'משקל גוף' then 'משקל גוף'
      when category = 'מכונות'
        or concat_ws(' ', name, normalized_equipment) ~ 'מכונ|כבל|פולי|סמית|המר' then 'מכונות'
      else 'משקולות'
    end as normalized_category
  from normalized
)
update public.workout_exercises as exercise
set
  category = classified.normalized_category,
  equipment = classified.normalized_equipment,
  primary_muscle_group = classified.normalized_primary_muscle,
  secondary_muscle_groups = classified.normalized_secondary_muscles,
  updated_at = now()
from classified
where exercise.id = classified.id
  and (
    exercise.category is distinct from classified.normalized_category
    or exercise.equipment is distinct from classified.normalized_equipment
    or exercise.primary_muscle_group is distinct from classified.normalized_primary_muscle
    or exercise.secondary_muscle_groups is distinct from classified.normalized_secondary_muscles
  );

do $$
begin
  if exists (
    select 1 from public.workout_exercises
    where category not in ('משקולות','מכונות','משקל גוף','TRX')
      or equipment is null or btrim(equipment) = ''
      or primary_muscle_group is null or btrim(primary_muscle_group) = ''
  ) then
    raise exception 'Exercise taxonomy normalization left invalid rows';
  end if;
end $$;

commit;
