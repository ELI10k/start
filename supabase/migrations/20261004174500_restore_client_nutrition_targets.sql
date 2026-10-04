begin;

alter table public.client_profiles
  add column if not exists carbohydrate_target numeric(8,2)
    check (carbohydrate_target is null or carbohydrate_target > 0),
  add column if not exists fat_target numeric(8,2)
    check (fat_target is null or fat_target > 0);

grant update(carbohydrate_target, fat_target) on table public.client_profiles to authenticated;

notify pgrst, 'reload schema';
commit;
