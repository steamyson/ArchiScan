-- Private bucket: facade-photos — authenticated users only under `{user_id}/*`

insert into storage.buckets (id, name, public)
values ('facade-photos', 'facade-photos', false)
on conflict (id) do nothing;

create policy "Authenticated users can read own facade photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'facade-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated users can upload own facade photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'facade-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated users can update own facade photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'facade-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'facade-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated users can delete own facade photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'facade-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
