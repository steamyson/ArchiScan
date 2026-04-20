-- M6 — Scan cost counter
-- Adds scan_count column to profiles + trigger that increments on every scans insert.
-- Used to monitor AI API spend against the $500/mo threshold (spec Section 10).

alter table public.profiles
  add column if not exists scan_count integer not null default 0;

create or replace function public.increment_scan_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set scan_count = scan_count + 1
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_scan_created on public.scans;

create trigger on_scan_created
  after insert on public.scans
  for each row execute function public.increment_scan_count();
