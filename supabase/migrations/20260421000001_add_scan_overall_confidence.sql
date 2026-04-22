-- Weighted confidence score per scan: (high*1.0 + medium*0.5) / total.
-- Range 0.00–1.00. Foundation for M7 data curation / quality filtering.

alter table public.scans add column if not exists overall_confidence numeric(3, 2);

comment on column public.scans.overall_confidence is
  'Weighted confidence score: (high*1.0 + medium*0.5 + low*0) / total elements. Range 0.00–1.00.';

-- Drop the 11-arg signature added in the previous migration, recreate with 12.
drop function if exists public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz, text, text
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
  p_model_used text default null,
  p_overall_confidence numeric default null
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
    model_used,
    overall_confidence
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
    p_model_used,
    p_overall_confidence
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz, text, text, numeric
) from public;

grant execute on function public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz, text, text, numeric
) to service_role;
