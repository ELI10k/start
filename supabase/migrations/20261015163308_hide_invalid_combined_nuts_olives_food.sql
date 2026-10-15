begin;

alter table public.foods
  add column if not exists catalogue_visible boolean not null default true;

update public.foods
set catalogue_visible = false,
    updated_at = now()
where id = 'master-f-001';

do $$
begin
  if not exists (
    select 1 from public.foods
    where id = 'master-f-001' and catalogue_visible = false
  ) then
    raise exception 'invalid_combined_nuts_olives_food_not_hidden';
  end if;
end $$;

commit;
