begin;

-- Keep legacy measurements intact for historical compatibility. New writes use
-- one explicit circumference value at the navel.
alter table public.progress_entries
  add column if not exists navel_circumference numeric(6,2)
  check (navel_circumference is null or navel_circumference > 0);

comment on column public.progress_entries.navel_circumference is 'היקף טבור בסנטימטרים';

notify pgrst, 'reload schema';
commit;
