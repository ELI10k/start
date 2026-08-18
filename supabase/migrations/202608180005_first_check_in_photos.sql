-- Photos on the first check-in as well as every fourth.
--
-- The first one is the baseline. Without it the fourth check-in's photos have
-- nothing to be compared against, and a new client went through three check-ins
-- before the app asked for a single picture.

begin;

create or replace function public.set_check_in_photo_requirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitted_count integer;
  v_number integer;
begin
  select count(*)::integer
  into v_submitted_count
  from public.check_ins
  where client_id = new.client_id;

  v_number := v_submitted_count + 1;
  new.photo_set_required := v_number = 1 or mod(v_number, 4) = 0;
  return new;
end;
$$;

-- Existing rows follow the same rule, numbered by submission order.
with numbered as (
  select id, row_number() over (partition by client_id order by submitted_at, id) as n
  from public.check_ins
)
update public.check_ins as check_in
set photo_set_required = (numbered.n = 1 or mod(numbered.n, 4) = 0)
from numbered
where numbered.id = check_in.id;

commit;
