-- Track which prompt version and Gemini model produced each scan.
-- Enables debugging analysis-quality regressions and A/B testing future prompt versions.

alter table public.scans add column if not exists prompt_version text;
alter table public.scans add column if not exists model_used text;

comment on column public.scans.prompt_version is
  'Gemini system prompt version (e.g. "0.2") that produced this scan.';
comment on column public.scans.model_used is
  'Gemini model that successfully completed the analysis (e.g. "gemini-2.5-flash").';

-- Re-create create_scan_from_analysis with two new parameters.
-- Postgres treats a changed parameter list as a new overload, so drop the old signature first.
drop function if exists public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz
);

create or replace function public.create_scan_from_analysis(
  p_user_id uuid,
  p_image_url text,
  p_overlay_data jsonb,
  p_building_summary jsonb,
  p_critique_text text,
  p_building_address text,
  p_lng double precision,
  p_lat double precision,
  p_captured_at timestamptz,
  p_prompt_version text default null,
  p_model_used text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.scans (
    user_id,
    image_url,
    overlay_data,
    building_summary,
    critique_text,
    building_address,
    coordinates,
    captured_at,
    prompt_version,
    model_used
  ) values (
    p_user_id,
    p_image_url,
    p_overlay_data,
    p_building_summary,
    p_critique_text,
    p_building_address,
    case
      when p_lng is not null and p_lat is not null then
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      else null
    end,
    p_captured_at,
    p_prompt_version,
    p_model_used
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz, text, text
) from public;

grant execute on function public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz, text, text
) to service_role;
