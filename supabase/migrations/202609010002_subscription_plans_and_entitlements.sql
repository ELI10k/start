-- Commercial access is separate from identity and coach assignment. Existing
-- clients are grandfathered without creating a payment-provider charge.
-- Rollback: drop the four tables and the two functions introduced below.
begin;

create table public.subscription_plans (
  code text primary key check (code in ('digital','coach','vip')),
  name text not null check (length(trim(name)) > 0),
  monthly_price_agorot integer check (monthly_price_agorot is null or monthly_price_agorot >= 0),
  active boolean not null default true,
  display_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_entitlements (
  plan_code text not null references public.subscription_plans(code) on delete cascade,
  capability text not null check (capability ~ '^[a-z][a-z0-9_]{2,63}$'),
  enabled boolean not null default true,
  limit_value integer check (limit_value is null or limit_value >= 0),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  primary key (plan_code, capability)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code) on delete restrict,
  status text not null check (status in ('trialing','active','past_due','paused','canceled','expired')),
  source text not null check (source in ('legacy','manual','web','apple','google')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end >= current_period_start),
  check (source = 'legacy' or provider_subscription_id is not null or source = 'manual')
);
create unique index subscriptions_one_current_per_user_idx on public.subscriptions(user_id)
  where status in ('trialing','active','past_due','paused');
create unique index subscriptions_provider_identity_idx on public.subscriptions(source, provider_subscription_id)
  where provider_subscription_id is not null;
create index subscriptions_user_history_idx on public.subscriptions(user_id, created_at desc);

create table public.entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability text not null check (capability ~ '^[a-z][a-z0-9_]{2,63}$'),
  enabled boolean not null,
  limit_value integer check (limit_value is null or limit_value >= 0),
  reason text not null check (length(trim(reason)) between 3 and 500),
  expires_at timestamptz,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index entitlement_overrides_active_idx on public.entitlement_overrides(user_id, capability, expires_at desc);

create table public.entitlement_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability text not null check (capability ~ '^[a-z][a-z0-9_]{2,63}$'),
  period_start date not null,
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id,capability,period_start)
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  desired_plan text not null references public.subscription_plans(code) on delete restrict,
  status text not null default 'pending' check(status in ('pending','converted','expired')),
  expires_at timestamptz not null default now()+interval '24 hours',
  created_at timestamptz not null default now(),
  converted_at timestamptz
);
create index checkout_sessions_user_created_idx on public.checkout_sessions(user_id,created_at desc);

create table public.billing_events (
  provider text not null check(provider ~ '^[a-z][a-z0-9_-]{1,31}$'),
  event_id text not null check(length(event_id) between 3 and 200),
  event_type text not null check(length(event_type) between 3 and 100),
  payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
  processed_at timestamptz not null default now(),
  result text not null,
  primary key(provider,event_id)
);

create trigger subscription_plans_touch before update on public.subscription_plans
for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
for each row execute function public.touch_updated_at();

insert into public.subscription_plans(code,name,monthly_price_agorot,display_order) values
  ('digital','START Digital',9700,10),
  ('coach','START Coach',null,20),
  ('vip','START VIP',null,30);

insert into public.plan_entitlements(plan_code,capability,enabled,limit_value) values
  ('digital','nutrition_plan',true,null),('digital','workout_plan',true,null),
  ('digital','recovery_mode',true,null),('digital','weekly_adaptation',true,null),
  ('digital','start_iq',true,null),('digital','premium_content',false,null),
  ('digital','coach_messaging',false,0),('digital','human_checkin_review',false,0),
  ('digital','technique_review',false,0),('digital','video_calls',false,0),
  ('coach','nutrition_plan',true,null),('coach','workout_plan',true,null),
  ('coach','recovery_mode',true,null),('coach','weekly_adaptation',true,null),
  ('coach','start_iq',true,null),('coach','premium_content',true,null),
  ('coach','coach_messaging',true,null),('coach','human_checkin_review',true,null),
  ('coach','technique_review',true,2),('coach','video_calls',false,0),
  ('vip','nutrition_plan',true,null),('vip','workout_plan',true,null),
  ('vip','recovery_mode',true,null),('vip','weekly_adaptation',true,null),
  ('vip','start_iq',true,null),('vip','premium_content',true,null),
  ('vip','coach_messaging',true,null),('vip','human_checkin_review',true,null),
  ('vip','technique_review',true,8),('vip','video_calls',true,1);

-- Preserve today's service level. These rows carry no provider identity and
-- cannot charge anyone. A later verified purchase replaces the legacy row.
insert into public.subscriptions(user_id,plan_code,status,source,current_period_start)
select p.id,
  case when exists(select 1 from public.coach_client_relationships r where r.client_id=p.id and r.status='active') then 'coach' else 'digital' end,
  'active','legacy',now()
from public.profiles p where p.role='client' and p.status='active'
on conflict do nothing;

create or replace function public.subscription_access(p_user_id uuid default auth.uid()) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_plan text; v_status text; v_source text; v_allowed boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  v_allowed := p_user_id=auth.uid() or public.is_coach_for(p_user_id);
  if not v_allowed then raise exception 'not_authorized'; end if;
  select s.plan_code,s.status,s.source into v_plan,v_status,v_source
  from public.subscriptions s where s.user_id=p_user_id
    and (s.status in ('trialing','active') or (s.status='past_due' and coalesce(s.grace_ends_at,'-infinity')>now()))
    and (s.current_period_end is null or s.current_period_end>now())
  order by s.created_at desc limit 1;
  return jsonb_build_object(
    'plan',v_plan,'status',v_status,'source',v_source,
    'entitlements',coalesce((select jsonb_object_agg(e.capability,jsonb_build_object('enabled',e.enabled,'limit',e.limit_value,'configuration',e.configuration)) from public.plan_entitlements e where e.plan_code=v_plan),'{}'::jsonb),
    'overrides',coalesce((select jsonb_object_agg(o.capability,jsonb_build_object('enabled',o.enabled,'limit',o.limit_value)) from (select distinct on (capability) capability,enabled,limit_value from public.entitlement_overrides where user_id=p_user_id and (expires_at is null or expires_at>now()) order by capability,created_at desc) o),'{}'::jsonb)
  );
end $$;

create or replace function public.has_entitlement(p_capability text,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce(
    ((public.subscription_access(p_user_id)->'overrides'->p_capability->>'enabled')::boolean),
    ((public.subscription_access(p_user_id)->'entitlements'->p_capability->>'enabled')::boolean),
    false
  )
$$;

create or replace function public.consume_entitlement(p_capability text,p_amount integer default 1) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_period date; v_used integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_amount<1 or p_amount>100 then raise exception 'invalid_amount'; end if;
  if not public.has_entitlement(p_capability,auth.uid()) then return jsonb_build_object('allowed',false,'reason','upgrade_required'); end if;
  select coalesce(
    (public.subscription_access(auth.uid())->'overrides'->p_capability->>'limit')::integer,
    (public.subscription_access(auth.uid())->'entitlements'->p_capability->>'limit')::integer
  ) into v_limit;
  if v_limit is null then return jsonb_build_object('allowed',true,'limit',null,'used',null); end if;
  v_period := date_trunc('month',now() at time zone 'Asia/Jerusalem')::date;
  insert into public.entitlement_usage(user_id,capability,period_start,used_count)
  values(auth.uid(),p_capability,v_period,p_amount)
  on conflict(user_id,capability,period_start) do update
    set used_count=public.entitlement_usage.used_count+excluded.used_count,updated_at=now()
    where public.entitlement_usage.used_count+excluded.used_count<=v_limit
  returning used_count into v_used;
  if v_used is null or v_used>v_limit then return jsonb_build_object('allowed',false,'reason','limit_reached','limit',v_limit); end if;
  return jsonb_build_object('allowed',true,'limit',v_limit,'used',v_used,'remaining',v_limit-v_used);
end $$;

create or replace function public.submit_technique_video(p_exercise_id text,p_exercise_name text,p_storage_path text,p_note text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_usage jsonb; v_id uuid;
begin
  if auth.uid() is null or public.current_role()<>'client' then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.coach_client_relationships where client_id=auth.uid() and status='active') then raise exception 'no_active_coach'; end if;
  if p_storage_path not like auth.uid()::text||'/%' then raise exception 'invalid_storage_path'; end if;
  if length(trim(p_exercise_id))<1 or length(trim(p_exercise_name))<1 or length(coalesce(p_note,''))>500 then raise exception 'invalid_video'; end if;
  v_usage:=public.consume_entitlement('technique_review',1);
  if not coalesce((v_usage->>'allowed')::boolean,false) then raise exception '%',coalesce(v_usage->>'reason','upgrade_required'); end if;
  insert into public.exercise_technique_videos(client_id,exercise_id,exercise_name,storage_path,note)
  values(auth.uid(),trim(p_exercise_id),left(trim(p_exercise_name),300),p_storage_path,nullif(trim(p_note),'')) returning id into v_id;
  return v_id;
end $$;

create or replace function public.apply_billing_event(
  p_provider text,p_event_id text,p_event_type text,p_payload_hash text,p_checkout_session uuid,
  p_provider_customer_id text,p_provider_subscription_id text,p_status text,p_period_end timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_checkout public.checkout_sessions; v_user_id uuid; v_plan text; v_source text;
begin
  if auth.role()<>'service_role' then raise exception 'not_authorized'; end if;
  if p_provider not in ('web','apple','google') or p_status not in ('trialing','active','past_due','paused','canceled','expired') then raise exception 'invalid_billing_event'; end if;
  if p_payload_hash!~'^[0-9a-f]{64}$' or length(coalesce(p_provider_subscription_id,''))<3 then raise exception 'invalid_billing_event'; end if;
  insert into public.billing_events(provider,event_id,event_type,payload_hash,result)
  values(p_provider,p_event_id,p_event_type,p_payload_hash,'processing') on conflict do nothing;
  if not found then return jsonb_build_object('processed',false,'duplicate',true); end if;

  if p_checkout_session is not null then
    select * into v_checkout from public.checkout_sessions where id=p_checkout_session for update;
    if v_checkout.id is null then raise exception 'invalid_checkout_session'; end if;
    if v_checkout.status='pending' and v_checkout.expires_at>now() then
      v_user_id:=v_checkout.user_id;v_plan:=v_checkout.desired_plan;
    else
      -- Renewal/cancellation webhooks sometimes repeat the original checkout
      -- reference. Once it was converted, the provider subscription is the
      -- authority and must still belong to the same checkout owner.
      select user_id,plan_code into v_user_id,v_plan from public.subscriptions
      where source=p_provider and provider_subscription_id=p_provider_subscription_id order by created_at desc limit 1;
      if v_user_id is null or v_user_id<>v_checkout.user_id then raise exception 'invalid_checkout_session'; end if;
    end if;
  else
    select user_id,plan_code into v_user_id,v_plan from public.subscriptions
    where source=p_provider and provider_subscription_id=p_provider_subscription_id order by created_at desc limit 1;
    if v_user_id is null then raise exception 'subscription_not_found'; end if;
  end if;
  v_source:=p_provider;

  update public.subscriptions set status='expired',current_period_end=coalesce(current_period_end,now()),updated_at=now()
  where user_id=v_user_id and status in ('trialing','active','past_due','paused')
    and not(source=v_source and provider_subscription_id=p_provider_subscription_id);
  insert into public.subscriptions(user_id,plan_code,status,source,provider_customer_id,provider_subscription_id,current_period_start,current_period_end,canceled_at)
  values(v_user_id,v_plan,p_status,v_source,nullif(p_provider_customer_id,''),p_provider_subscription_id,now(),p_period_end,case when p_status in ('canceled','expired') then now() end)
  on conflict(source,provider_subscription_id) where provider_subscription_id is not null do update
    set plan_code=excluded.plan_code,status=excluded.status,provider_customer_id=coalesce(excluded.provider_customer_id,public.subscriptions.provider_customer_id),current_period_end=excluded.current_period_end,canceled_at=excluded.canceled_at,updated_at=now();
  if p_checkout_session is not null and p_status in ('trialing','active') then
    update public.checkout_sessions set status='converted',converted_at=now() where id=p_checkout_session;
  end if;
  update public.billing_events set result='applied' where provider=p_provider and event_id=p_event_id;
  return jsonb_build_object('processed',true,'user_id',v_user_id,'plan',v_plan,'status',p_status);
exception when others then
  -- The transaction rolls the event row back too, so the provider may retry a
  -- transient failure with the same id rather than being mistaken for duplicate.
  raise;
end $$;

create or replace function public.grant_coached_client_subscription(p_client_id uuid,p_coach_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.coach_client_relationships where client_id=p_client_id and coach_id=p_coach_id and status='active') then
    raise exception 'active_relationship_required';
  end if;
  select id into v_id from public.subscriptions where user_id=p_client_id and plan_code='coach' and status in ('trialing','active','past_due','paused') order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  update public.subscriptions set status='expired',current_period_end=coalesce(current_period_end,now()),updated_at=now()
  where user_id=p_client_id and status in ('trialing','active','past_due','paused');
  insert into public.subscriptions(user_id,plan_code,status,source,current_period_start)
  values(p_client_id,'coach','active','manual',now()) returning id into v_id;
  return v_id;
end $$;

alter table public.subscription_plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlement_overrides enable row level security;
alter table public.entitlement_usage enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.billing_events enable row level security;
create policy subscription_plans_authenticated_read on public.subscription_plans for select to authenticated using (active);
create policy plan_entitlements_authenticated_read on public.plan_entitlements for select to authenticated using (true);
create policy subscriptions_self_read on public.subscriptions for select to authenticated using (user_id=(select auth.uid()));
create policy subscriptions_coach_read on public.subscriptions for select to authenticated using (public.is_coach_for(user_id));
create policy entitlement_overrides_self_read on public.entitlement_overrides for select to authenticated using (user_id=(select auth.uid()));
create policy entitlement_overrides_coach_read on public.entitlement_overrides for select to authenticated using (public.is_coach_for(user_id));
create policy entitlement_usage_self_read on public.entitlement_usage for select to authenticated using (user_id=(select auth.uid()));
create policy checkout_sessions_self_read on public.checkout_sessions for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists technique_video_client_insert on public.exercise_technique_videos;
revoke insert on public.exercise_technique_videos from authenticated;
drop policy if exists technique_video_client_upload on storage.objects;
create policy technique_video_entitled_client_upload on storage.objects for insert to authenticated with check(
  bucket_id='technique-videos' and (storage.foldername(name))[1]=(select auth.uid())::text
  and public.current_role()='client' and public.has_entitlement('technique_review')
  and exists(select 1 from public.coach_client_relationships where client_id=(select auth.uid()) and status='active')
);

revoke all on public.subscription_plans,public.plan_entitlements,public.subscriptions,public.entitlement_overrides,public.entitlement_usage,public.checkout_sessions,public.billing_events from anon,authenticated;
grant select on public.subscription_plans,public.plan_entitlements,public.subscriptions,public.entitlement_overrides,public.entitlement_usage,public.checkout_sessions to authenticated;
revoke all on function public.subscription_access(uuid),public.has_entitlement(text,uuid),public.consume_entitlement(text,integer),public.submit_technique_video(text,text,text,text) from public;
grant execute on function public.subscription_access(uuid),public.has_entitlement(text,uuid),public.consume_entitlement(text,integer),public.submit_technique_video(text,text,text,text) to authenticated;
revoke all on function public.apply_billing_event(text,text,text,text,uuid,text,text,text,timestamptz) from public;
grant execute on function public.apply_billing_event(text,text,text,text,uuid,text,text,text,timestamptz) to service_role;
revoke all on function public.grant_coached_client_subscription(uuid,uuid) from public;
grant execute on function public.grant_coached_client_subscription(uuid,uuid) to service_role;

commit;
