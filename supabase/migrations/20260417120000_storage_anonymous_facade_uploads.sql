-- Signed-out capture: app uploads to `anonymous/{uuid}.jpg` (see lib/storage.ts).
-- Without this, only `authenticated` + `{auth.uid()}/*` from the prior migration applies.

create policy "Anonymous users can upload to anonymous folder"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'facade-photos'
    and (storage.foldername(name))[1] = 'anonymous'
  );
