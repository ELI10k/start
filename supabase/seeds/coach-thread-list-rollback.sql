-- Undoes 202608210005. The application falls back to folding the most recent
-- messages client-side, which is what it did before - with the ceiling that
-- migration was written to remove.

begin;

drop function if exists public.coach_message_threads();
drop index if exists public.coach_client_messages_client_recent_idx;

notify pgrst, 'reload schema';
commit;
