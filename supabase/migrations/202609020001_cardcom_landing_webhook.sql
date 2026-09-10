begin;

-- Cardcom landing pages identify the buyer by the email collected before the
-- redirect. Only the service-role webhook may exchange a verified transaction
-- for access; browser return pages never call this function.
create or replace function public.apply_cardcom_landing_event(
  p_event_id text,
  p_email text,
  p_plan text,
  p_provider_subscription_id text,
  p_payload_hash text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_user_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'not_authorized'; end if;
  if length(coalesce(p_event_id,'')) not between 3 and 200
     or lower(trim(coalesce(p_email,''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_plan not in ('digital','coach','vip')
     or length(coalesce(p_provider_subscription_id,'')) not between 3 and 200
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_cardcom_event';
  end if;

  insert into public.billing_events(provider,event_id,event_type,payload_hash,result)
  values('cardcom',p_event_id,'landing_payment_succeeded',p_payload_hash,'processing')
  on conflict do nothing;
  if not found then return jsonb_build_object('processed',false,'duplicate',true); end if;

  select id into v_user_id from public.profiles
  where lower(email)=lower(trim(p_email)) and role='client' and status='active'
  limit 1 for update;
  if v_user_id is null then raise exception 'client_not_found'; end if;

  update public.subscriptions
  set status='expired',current_period_end=coalesce(current_period_end,now()),updated_at=now()
  where user_id=v_user_id and status in ('trialing','active','past_due','paused')
    and not(source='web' and provider_subscription_id=p_provider_subscription_id);

  insert into public.subscriptions(
    user_id,plan_code,status,source,provider_customer_id,provider_subscription_id,current_period_start
  ) values(
    v_user_id,p_plan,'active','web',lower(trim(p_email)),p_provider_subscription_id,now()
  )
  on conflict(source,provider_subscription_id) where provider_subscription_id is not null do update
  set plan_code=excluded.plan_code,status='active',updated_at=now();

  update public.billing_events set result='applied'
  where provider='cardcom' and event_id=p_event_id;
  return jsonb_build_object('processed',true,'user_id',v_user_id,'plan',p_plan);
end;
$$;

revoke all on function public.apply_cardcom_landing_event(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_cardcom_landing_event(text,text,text,text,text) to service_role;

update public.subscription_plans set monthly_price_agorot=19700 where code='coach';
update public.subscription_plans set monthly_price_agorot=29700 where code='vip';

commit;
