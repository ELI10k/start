begin;

-- Exercise guidance: the coaching detail that belongs behind a "דגשים לתרגיל"
-- button rather than on the workout screen itself.
--
-- Additive and reversible. Every column is nullable or defaults to an empty
-- array, so existing rows, the catalog import and every read path keep working
-- unchanged. Nothing here invents content: the columns start empty and are
-- filled by the coach through save_exercise_guidance.
--
-- Rollback: alter table public.workout_exercises
--             drop column image_url, drop column how_to,
--             drop column cues, drop column common_mistakes;
--           drop function public.save_exercise_guidance(text,text,text,text[],text[]);

alter table public.workout_exercises
  add column if not exists image_url text,
  add column if not exists how_to text,
  add column if not exists cues text[] not null default '{}',
  add column if not exists common_mistakes text[] not null default '{}';

-- Only a coach may write guidance, and only in the shapes the panel can render:
-- an https image, at most six cues and six mistakes, each a real sentence.
create or replace function public.save_exercise_guidance(
  p_exercise_id text,
  p_image_url text,
  p_how_to text,
  p_cues text[],
  p_common_mistakes text[]
) returns text language plpgsql security definer set search_path=public as $$
declare
  v_cues text[] := coalesce(array(select trim(value) from unnest(coalesce(p_cues,'{}'::text[])) as value where length(trim(value))>0),'{}');
  v_mistakes text[] := coalesce(array(select trim(value) from unnest(coalesce(p_common_mistakes,'{}'::text[])) as value where length(trim(value))>0),'{}');
  v_image text := nullif(trim(coalesce(p_image_url,'')),'');
begin
  if public.current_role()<>'coach' then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.workout_exercises where id=p_exercise_id) then raise exception 'exercise_not_found'; end if;
  if v_image is not null and v_image !~ '^https://' then raise exception 'invalid_image_url'; end if;
  if array_length(v_cues,1)>6 or array_length(v_mistakes,1)>6 then raise exception 'too_many_points'; end if;
  if length(coalesce(p_how_to,''))>2000 then raise exception 'how_to_too_long'; end if;

  update public.workout_exercises
  set image_url=v_image,
      how_to=nullif(trim(coalesce(p_how_to,'')),''),
      cues=v_cues,
      common_mistakes=v_mistakes
  where id=p_exercise_id;

  return p_exercise_id;
end $$;

revoke all on function public.save_exercise_guidance(text,text,text,text[],text[]) from public;
grant execute on function public.save_exercise_guidance(text,text,text,text[],text[]) to authenticated;

commit;
