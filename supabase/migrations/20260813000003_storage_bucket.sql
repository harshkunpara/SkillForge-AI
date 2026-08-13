-- ============================================================================
-- 20260813000003_storage_resumes.sql
-- SkillForge AI — private "resumes" Storage bucket + owner-only RLS.
--
-- NOTE: 001_schema.sql already creates a private "resumes" bucket with
-- owner-scoped insert/select policies. This migration is idempotent
-- (safe to run standalone / on a fresh project) and additionally adds the
-- update + delete owner policies that were missing, so a user can replace
-- or remove their own resume file without a service-role call.
--
-- Path convention enforced by policy: objects must be stored as
--   {auth.uid()}/{filename}
-- i.e. the first path segment is the owning user's UUID.
-- ============================================================================

begin;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload own resume'
  ) then
    create policy "Users can upload own resume" on storage.objects for insert
      with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can view own resume'
  ) then
    create policy "Users can view own resume" on storage.objects for select
      using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can replace own resume'
  ) then
    create policy "Users can replace own resume" on storage.objects for update
      using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1])
      with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete own resume'
  ) then
    create policy "Users can delete own resume" on storage.objects for delete
      using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

commit;

-- ============================================================================
-- DOWN / ROLLBACK
-- ============================================================================

-- begin;
--
-- drop policy if exists "Users can delete own resume" on storage.objects;
-- drop policy if exists "Users can replace own resume" on storage.objects;
-- drop policy if exists "Users can view own resume" on storage.objects;
-- drop policy if exists "Users can upload own resume" on storage.objects;
--
-- -- Only drop the bucket if you're certain no files are relied upon:
-- -- delete from storage.objects where bucket_id = 'resumes';
-- -- delete from storage.buckets where id = 'resumes';
--
-- commit;
-- ============================================================================
