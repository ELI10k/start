-- The create statements for public.weekly_summaries, rebuilt from the catalog.
-- pg_dump needs Docker, which this machine does not have; this is the same
-- information by another route, so the table's shape is backed up as SQL and not
-- only as a JSON description of itself.
select
  'create table public.weekly_summaries (' || E'\n  ' ||
  (select string_agg(
      quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod)
        || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
        || case when a.attnotnull then ' not null' else '' end,
      E',\n  ' order by a.attnum)
   from pg_attribute a
   left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where a.attrelid = 'public.weekly_summaries'::regclass and a.attnum > 0 and not a.attisdropped)
  || E',\n  ' ||
  (select string_agg('constraint ' || quote_ident(conname) || ' ' || pg_get_constraintdef(oid), E',\n  ' order by conname)
   from pg_constraint where conrelid = 'public.weekly_summaries'::regclass)
  || E'\n);\n\n' ||
  coalesce((select string_agg(indexdef || ';', E'\n' order by indexname)
            from pg_indexes where schemaname = 'public' and tablename = 'weekly_summaries'
              and indexname not in (select conname from pg_constraint where conrelid = 'public.weekly_summaries'::regclass)), '')
  || E'\n\nalter table public.weekly_summaries ' ||
  case when (select relrowsecurity from pg_class where oid = 'public.weekly_summaries'::regclass)
       then 'enable' else 'disable' end || E' row level security;\n\n' ||
  coalesce((select string_agg(
      'create policy ' || quote_ident(policyname) || ' on public.weekly_summaries for ' || cmd
        || ' to ' || array_to_string(roles, ', ')
        || coalesce(' using (' || qual || ')', '')
        || coalesce(' with check (' || with_check || ')', '') || ';',
      E'\n' order by policyname)
   from pg_policies where schemaname = 'public' and tablename = 'weekly_summaries'), '')
  || E'\n\n-- triggers\n' ||
  coalesce((select string_agg(pg_get_triggerdef(oid) || ';', E'\n' order by tgname)
            from pg_trigger where tgrelid = 'public.weekly_summaries'::regclass and not tgisinternal),
           '-- (none)')
  as ddl;
