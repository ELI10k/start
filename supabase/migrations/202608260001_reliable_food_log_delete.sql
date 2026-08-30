begin;

-- The caller may delete only its own row. SECURITY DEFINER intentionally
-- bypasses a stale/missing table DELETE policy while auth.uid() keeps the
-- operation strictly scoped to the signed-in client.
create or replace function public.delete_client_food_log(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.client_food_log
    where id = p_id and client_id = auth.uid();
  return found;
end $$;

revoke all on function public.delete_client_food_log(uuid) from public, anon;
grant execute on function public.delete_client_food_log(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
