-- Everything about public.weekly_summaries that a migration could change, in one
-- row: its columns, indexes, constraints, triggers, policies, grants and how many
-- rows it holds. Read-only. Run it before and after a migration and diff the two.
select json_build_object(
  'captured_at', now(),
  'row_count', (select count(*) from public.weekly_summaries),
  'rows_by_status', (select coalesce(json_object_agg(status, n), '{}'::json)
                     from (select status, count(*) n from public.weekly_summaries group by status) s),
  'distinct_clients', (select count(distinct client_id) from public.weekly_summaries),
  'column_count', (select count(*) from information_schema.columns
                   where table_schema = 'public' and table_name = 'weekly_summaries'),
  'columns', (select json_agg(json_build_object('n', ordinal_position, 'name', column_name, 'type', data_type,
                                                'nullable', is_nullable, 'default', column_default)
                              order by ordinal_position)
              from information_schema.columns where table_schema = 'public' and table_name = 'weekly_summaries'),
  'indexes', (select json_agg(indexdef order by indexname)
              from pg_indexes where schemaname = 'public' and tablename = 'weekly_summaries'),
  'constraints', (select json_agg(json_build_object('name', conname, 'def', pg_get_constraintdef(oid)) order by conname)
                  from pg_constraint where conrelid = 'public.weekly_summaries'::regclass),
  'triggers', (select coalesce(json_agg(json_build_object('name', tgname, 'def', pg_get_triggerdef(oid)) order by tgname), '[]'::json)
               from pg_trigger where tgrelid = 'public.weekly_summaries'::regclass and not tgisinternal),
  'policies', (select json_agg(json_build_object('name', policyname, 'cmd', cmd, 'roles', roles::text,
                                                 'using', qual, 'check', with_check) order by policyname)
               from pg_policies where schemaname = 'public' and tablename = 'weekly_summaries'),
  'rls_enabled', (select relrowsecurity from pg_class where oid = 'public.weekly_summaries'::regclass),
  'grants', (select json_agg(grantee || ':' || privilege_type order by grantee, privilege_type)
             from information_schema.role_table_grants
             where table_schema = 'public' and table_name = 'weekly_summaries'),
  'freeze_function_exists', exists(select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                                   where ns.nspname = 'public' and p.proname = 'freeze_approved_weekly_summary'),
  'new_columns_present', (select coalesce(json_agg(column_name order by column_name), '[]'::json)
                          from information_schema.columns
                          where table_schema = 'public' and table_name = 'weekly_summaries'
                            and column_name in ('edited_went_well', 'edited_needs_work', 'edited_actions', 'approved_at', 'approved_by')),
  'migration_recorded', exists(select 1 from supabase_migrations.schema_migrations where version = '202608120002')
) as snapshot;
