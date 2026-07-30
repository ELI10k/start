begin;

alter table public.check_ins
  add column if not exists photo_set_required boolean not null default false;

create or replace function public.set_check_in_photo_requirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitted_count integer;
begin
  select count(*)::integer
  into v_submitted_count
  from public.check_ins
  where client_id = new.client_id;

  new.photo_set_required := mod(v_submitted_count + 1, 4) = 0;
  return new;
end;
$$;

drop trigger if exists check_ins_set_photo_requirement on public.check_ins;
create trigger check_ins_set_photo_requirement
before insert on public.check_ins
for each row execute function public.set_check_in_photo_requirement();

-- Existing rows are numbered by actual submission order, not calendar weeks.
with numbered as (
  select
    id,
    mod(row_number() over (
      partition by client_id
      order by submitted_at, id
    ), 4) = 0 as required
  from public.check_ins
)
update public.check_ins as check_in
set photo_set_required = numbered.required
from numbered
where numbered.id = check_in.id;

commit;
