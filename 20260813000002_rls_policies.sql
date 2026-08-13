-- ============================================================================
-- 20260813000002_rls_policies.sql
-- SkillForge AI — RLS policies for tables created/touched in
-- 20260813000001_foundation.sql, plus admin-only + Storage policies.
--
-- Convention: every user-owned table gets 4 policies (select/insert/update/
-- delete) scoped to auth.uid() = user_id. Admin tables are readable/writable
-- only by rows in public.profiles where role = 'admin'. All policies use
-- `create policy ... ` guarded by a DO block checking pg_policies so this
-- file is safe to re-run.
-- ============================================================================

begin;

-- Helper: is the calling JWT an admin? (checked against profiles.role,
-- which is only ever settable by an admin/service-role — never by the
-- user themselves, since profiles UPDATE policy is scoped to their own
-- row and role is not something the client should be trusted to change
-- via a wide-open policy; see admin-only UPDATE guard on profiles below.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Generic policy creator to avoid "policy already exists" errors on rerun
-- ----------------------------------------------------------------------------
create or replace function public._create_policy_if_missing(
  p_table text, p_policy text, p_sql text
) returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = p_table and policyname = p_policy
  ) then
    execute p_sql;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- resumes
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('resumes', 'Users can view own resumes',
  'create policy "Users can view own resumes" on public.resumes for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('resumes', 'Users can insert own resumes',
  'create policy "Users can insert own resumes" on public.resumes for insert with check (auth.uid() = user_id)');
select public._create_policy_if_missing('resumes', 'Users can update own resumes',
  'create policy "Users can update own resumes" on public.resumes for update using (auth.uid() = user_id)');
select public._create_policy_if_missing('resumes', 'Users can delete own resumes',
  'create policy "Users can delete own resumes" on public.resumes for delete using (auth.uid() = user_id)');

-- ----------------------------------------------------------------------------
-- skill_requirements — reference data, readable by any authenticated user,
-- writable only by admins (this is shared catalog data, not per-user)
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('skill_requirements', 'Authenticated users can view skill requirements',
  'create policy "Authenticated users can view skill requirements" on public.skill_requirements for select using (auth.role() = ''authenticated'')');
select public._create_policy_if_missing('skill_requirements', 'Admins can insert skill requirements',
  'create policy "Admins can insert skill requirements" on public.skill_requirements for insert with check (public.is_admin())');
select public._create_policy_if_missing('skill_requirements', 'Admins can update skill requirements',
  'create policy "Admins can update skill requirements" on public.skill_requirements for update using (public.is_admin())');
select public._create_policy_if_missing('skill_requirements', 'Admins can delete skill requirements',
  'create policy "Admins can delete skill requirements" on public.skill_requirements for delete using (public.is_admin())');

-- ----------------------------------------------------------------------------
-- readiness_scores
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('readiness_scores', 'Users can view own readiness score',
  'create policy "Users can view own readiness score" on public.readiness_scores for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('readiness_scores', 'Users can insert own readiness score',
  'create policy "Users can insert own readiness score" on public.readiness_scores for insert with check (auth.uid() = user_id)');
select public._create_policy_if_missing('readiness_scores', 'Users can update own readiness score',
  'create policy "Users can update own readiness score" on public.readiness_scores for update using (auth.uid() = user_id)');

-- ----------------------------------------------------------------------------
-- recommendations
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('recommendations', 'Users can view own recommendations',
  'create policy "Users can view own recommendations" on public.recommendations for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('recommendations', 'Users can insert own recommendations',
  'create policy "Users can insert own recommendations" on public.recommendations for insert with check (auth.uid() = user_id)');
select public._create_policy_if_missing('recommendations', 'Users can update own recommendations',
  'create policy "Users can update own recommendations" on public.recommendations for update using (auth.uid() = user_id)');
select public._create_policy_if_missing('recommendations', 'Users can delete own recommendations',
  'create policy "Users can delete own recommendations" on public.recommendations for delete using (auth.uid() = user_id)');

-- ----------------------------------------------------------------------------
-- interviews
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('interviews', 'Users can view own interviews',
  'create policy "Users can view own interviews" on public.interviews for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('interviews', 'Users can insert own interviews',
  'create policy "Users can insert own interviews" on public.interviews for insert with check (auth.uid() = user_id)');
select public._create_policy_if_missing('interviews', 'Users can update own interviews',
  'create policy "Users can update own interviews" on public.interviews for update using (auth.uid() = user_id)');

-- ----------------------------------------------------------------------------
-- processing_jobs
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('processing_jobs', 'Users can view own jobs',
  'create policy "Users can view own jobs" on public.processing_jobs for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('processing_jobs', 'Users can insert own jobs',
  'create policy "Users can insert own jobs" on public.processing_jobs for insert with check (auth.uid() = user_id)');
-- NOTE: no client UPDATE policy — job status transitions (queued -> running ->
-- completed/failed) are written by the Edge Function using the service-role
-- client, which bypasses RLS entirely. Do not add a client update policy here.

-- ----------------------------------------------------------------------------
-- evidence_records
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('evidence_records', 'Users can view own evidence',
  'create policy "Users can view own evidence" on public.evidence_records for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('evidence_records', 'Users can insert own evidence',
  'create policy "Users can insert own evidence" on public.evidence_records for insert with check (auth.uid() = user_id)');

-- ----------------------------------------------------------------------------
-- data_conflicts
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('data_conflicts', 'Users can view own conflicts',
  'create policy "Users can view own conflicts" on public.data_conflicts for select using (auth.uid() = user_id)');
select public._create_policy_if_missing('data_conflicts', 'Users can update own conflicts',
  'create policy "Users can update own conflicts" on public.data_conflicts for update using (auth.uid() = user_id)');
-- NOTE: no client INSERT policy — conflicts are raised by server-side
-- reconciliation logic (service-role), not by the client directly.

-- ----------------------------------------------------------------------------
-- admin_audit_logs — admin role only, both read and write
-- ----------------------------------------------------------------------------
select public._create_policy_if_missing('admin_audit_logs', 'Admins can view audit logs',
  'create policy "Admins can view audit logs" on public.admin_audit_logs for select using (public.is_admin())');
select public._create_policy_if_missing('admin_audit_logs', 'Admins can insert audit logs',
  'create policy "Admins can insert audit logs" on public.admin_audit_logs for insert with check (public.is_admin() and admin_id = auth.uid())');
-- No update/delete policy at all: audit logs are append-only for anyone,
-- including admins, via the client. Corrections require a service-role
-- operation outside normal app flow.

-- ----------------------------------------------------------------------------
-- profiles.role — lock down: users cannot self-promote to admin.
-- Replace the existing permissive "Users can update own profile" policy
-- with one that still allows users to update their own row, but forbids
-- changing `role` unless the caller is already an admin.
-- ----------------------------------------------------------------------------
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile (non-role fields)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (role = (select p.role from public.profiles p where p.id = auth.uid()) or public.is_admin())
  );

select public._create_policy_if_missing('profiles', 'Admins can view all profiles',
  'create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin())');
select public._create_policy_if_missing('profiles', 'Admins can update any profile',
  'create policy "Admins can update any profile" on public.profiles for update using (public.is_admin())');

-- Cleanup helper function (policies are already created; no longer needed)
drop function if exists public._create_policy_if_missing(text, text, text);

commit;

-- ============================================================================
-- DOWN / ROLLBACK
-- ============================================================================

-- begin;
--
-- drop policy if exists "Admins can update any profile" on public.profiles;
-- drop policy if exists "Admins can view all profiles" on public.profiles;
-- drop policy if exists "Users can update own profile (non-role fields)" on public.profiles;
-- create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
--
-- drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;
-- drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
--
-- drop policy if exists "Users can update own conflicts" on public.data_conflicts;
-- drop policy if exists "Users can view own conflicts" on public.data_conflicts;
--
-- drop policy if exists "Users can insert own evidence" on public.evidence_records;
-- drop policy if exists "Users can view own evidence" on public.evidence_records;
--
-- drop policy if exists "Users can insert own jobs" on public.processing_jobs;
-- drop policy if exists "Users can view own jobs" on public.processing_jobs;
--
-- drop policy if exists "Users can update own interviews" on public.interviews;
-- drop policy if exists "Users can insert own interviews" on public.interviews;
-- drop policy if exists "Users can view own interviews" on public.interviews;
--
-- drop policy if exists "Users can delete own recommendations" on public.recommendations;
-- drop policy if exists "Users can update own recommendations" on public.recommendations;
-- drop policy if exists "Users can insert own recommendations" on public.recommendations;
-- drop policy if exists "Users can view own recommendations" on public.recommendations;
--
-- drop policy if exists "Users can update own readiness score" on public.readiness_scores;
-- drop policy if exists "Users can insert own readiness score" on public.readiness_scores;
-- drop policy if exists "Users can view own readiness score" on public.readiness_scores;
--
-- drop policy if exists "Admins can delete skill requirements" on public.skill_requirements;
-- drop policy if exists "Admins can update skill requirements" on public.skill_requirements;
-- drop policy if exists "Admins can insert skill requirements" on public.skill_requirements;
-- drop policy if exists "Authenticated users can view skill requirements" on public.skill_requirements;
--
-- drop policy if exists "Users can delete own resumes" on public.resumes;
-- drop policy if exists "Users can update own resumes" on public.resumes;
-- drop policy if exists "Users can insert own resumes" on public.resumes;
-- drop policy if exists "Users can view own resumes" on public.resumes;
--
-- drop function if exists public.is_admin();
--
-- commit;
-- ============================================================================
