-- Inserts a scan row with a proper geography point (avoids PostgREST WKT quirks from Edge).

create or replace function public.create_scan_from_analysis(
  p_user_id uuid,
  p_image_url text,
  p_overlay_data jsonb,
  p_building_summary jsonb,
  p_critique_text text,
  p_building_address text,
  p_lng double precision,
  p_lat double precision,
  p_captured_at timestamptz
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
    captured_at
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
    p_captured_at
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz
) FROM PUBLIC;

grant execute on function public.create_scan_from_analysis(
  uuid, text, jsonb, jsonb, text, text, double precision, double precision, timestamptz
) to service_role;
