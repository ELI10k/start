begin;

create table if not exists public.app_rate_limits (
  subject_hash text not null check (length(subject_hash) = 64),
  action text not null check (length(action) between 1 and 80),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (subject_hash, action, window_start)
);

alter table public.app_rate_limits enable row level security;
revoke all on public.app_rate_limits from public, anon, authenticated;

create or replace function public.consume_app_rate_limit(
  p_subject text,
  p_action text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_subject !~ '^[0-9a-f]{64}$'
     or length(p_action) not between 1 and 80
     or p_window_seconds not between 1 and 86400
     or p_limit not between 1 and 10000 then
    return false;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds)
    * p_window_seconds
  );

  insert into public.app_rate_limits(subject_hash, action, window_start, request_count)
  values (p_subject, p_action, v_window, 1)
  on conflict (subject_hash, action, window_start)
  do update set request_count = public.app_rate_limits.request_count + 1
  returning request_count into v_count;

  -- Bounded opportunistic cleanup; this table is not an audit log.
  delete from public.app_rate_limits
  where window_start < clock_timestamp() - interval '2 days';

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_app_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_app_rate_limit(text, text, integer, integer)
  to service_role;

commit;
