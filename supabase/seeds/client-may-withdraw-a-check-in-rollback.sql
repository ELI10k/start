-- Undoes 202608210006. A client can no longer withdraw a check-in, which returns
-- them to having no way to correct one. Nothing stored changes.

begin;

drop policy if exists check_ins_self_delete on public.check_ins;
revoke delete on public.check_ins from authenticated;

notify pgrst, 'reload schema';
commit;
