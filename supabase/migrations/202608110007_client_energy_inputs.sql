begin;

-- The inputs a calorie target is actually computed from.
--
-- Until now the intake carried a birth date, a free-text goal and a free-text
-- "activity level", none of which a calculation can use: a date needs an age
-- derived at read time, and free text cannot be mapped to a deficit. The menu
-- builder therefore had no way to compute anything and made the coach type a
-- calorie target by hand.
--
-- Each column is nullable. A client whose sex or age was never recorded is not
-- broken - the calculation reports which field is missing rather than guessing,
-- and Mifflin-St Jeor's two variants differ by 166 kcal, which is far too much
-- to average away.
--
-- Rollback: alter table public.client_profiles
--             drop column age_years, drop column sex, drop column daily_steps,
--             drop column nutrition_goal, drop column trainee_level;

alter table public.client_profiles
  add column if not exists age_years smallint check (age_years is null or age_years between 12 and 100),
  add column if not exists sex text check (sex is null or sex in ('male', 'female')),
  add column if not exists daily_steps integer check (daily_steps is null or daily_steps between 0 and 60000),
  -- The five goals the product defines, each with a fixed calorie offset.
  add column if not exists nutrition_goal text check (nutrition_goal is null or nutrition_goal in ('maintain', 'gentle_cut', 'fast_cut', 'lean_bulk', 'dirty_bulk')),
  -- Replaces the free-text "activity level". It sizes the training programme and
  -- is deliberately not an input to the calorie calculation: a beginner who
  -- walks 14,000 steps a day burns more than an advanced lifter who drives.
  add column if not exists trainee_level text check (trainee_level is null or trainee_level in ('beginner', 'intermediate', 'advanced'));

commit;
