-- M5 — add `saved` boolean to scans so users can explicitly collect a scan.
-- Existing rows keep their current state (default false); new analyses default to unsaved.

alter table public.scans
  add column if not exists saved boolean not null default false;

create index if not exists scans_user_saved_captured_idx
  on public.scans (user_id, saved, captured_at desc);
