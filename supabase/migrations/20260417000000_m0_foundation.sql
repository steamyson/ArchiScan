-- M0 — Foundation (run in Supabase SQL editor or via supabase db push)
-- Profiles + scans schema and RLS (order: enable RLS before policies per brief)

-- Enable PostGIS
create extension if not exists postgis;

-- Profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Scans (schema created now, first writes in M2)
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  overlay_data jsonb,
  building_summary jsonb,
  critique_text text,
  building_address text,
  coordinates geography(point, 4326),
  captured_at timestamptz default now(),
  user_notes text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.scans enable row level security;

create policy "Users can view own scans"
  on public.scans for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert with check (auth.uid() = user_id);

create policy "Users can update own scans"
  on public.scans for update using (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.scans for delete using (auth.uid() = user_id);
