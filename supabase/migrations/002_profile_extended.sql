-- Extended profile fields for full student profile
alter table public.profiles
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists graduation_year text,
  add column if not exists weekly_hours int default 10,
  add column if not exists career_goal text,
  add column if not exists target_company text,
  add column if not exists avatar_url text,
  add column if not exists resume_data jsonb default '{}';

-- Index for faster profile lookups
create index if not exists profiles_user_id_idx on public.profiles(id);

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

create policy "Users can upload own avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars" on storage.objects for select
  using (bucket_id = 'avatars');
