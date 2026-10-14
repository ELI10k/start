-- Which writers stood behind a day's steps or a night's sleep - Apple Watch,
-- iPhone, Oura, Ultrahuman, RingConn - exactly as HealthKit described them
-- (HKSourceRevision + HKDevice). Display and debugging only.
--
-- Forward-only and additive: one nullable column per table. Existing rows keep
-- null and read as "Apple Health"; nothing that shows a figure depends on it,
-- and the app falls back to the old columns while this is unapplied.
-- Writes go through the existing client_all policies (client_id = auth.uid()),
-- and coaches read it through the existing coach_read policies.
--
-- Rollback: alter table public.health_steps drop column if exists source_details;
--           alter table public.health_sleep drop column if exists source_details;

begin;

alter table public.health_steps add column if not exists source_details jsonb;
alter table public.health_sleep add column if not exists source_details jsonb;

-- A bounded shape: an object with a short "devices" array. Anything larger is
-- not metadata any more.
alter table public.health_steps drop constraint if exists health_steps_source_details_shape;
alter table public.health_steps add constraint health_steps_source_details_shape check (
  source_details is null or (
    jsonb_typeof(source_details) = 'object'
    and jsonb_typeof(source_details -> 'devices') = 'array'
    and jsonb_array_length(source_details -> 'devices') <= 6
    and pg_column_size(source_details) <= 4096
  )
);

alter table public.health_sleep drop constraint if exists health_sleep_source_details_shape;
alter table public.health_sleep add constraint health_sleep_source_details_shape check (
  source_details is null or (
    jsonb_typeof(source_details) = 'object'
    and jsonb_typeof(source_details -> 'devices') = 'array'
    and jsonb_array_length(source_details -> 'devices') <= 6
    and pg_column_size(source_details) <= 4096
  )
);

commit;
