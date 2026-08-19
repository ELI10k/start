-- Rollback for 202608190003_coach_response_templates.sql.
--
-- Drops the coaches' saved replies. Nothing else referenced them, so nothing
-- else changes; the responses already sent are stored on the check-ins and are
-- untouched by this.

begin;

drop function if exists public.record_response_template_use(uuid);
drop table if exists public.coach_response_templates;

notify pgrst, 'reload schema';
commit;
