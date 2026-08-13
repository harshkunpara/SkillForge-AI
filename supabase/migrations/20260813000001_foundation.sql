-- ============================================================================
-- 20260813000001_foundation.sql
-- SkillForge AI — Foundation migration
--
-- This migration is ADDITIVE and IDEMPOTENT with respect to the existing
-- schema shipped in 001_schema.sql / 002_profile_extended.sql:
--   - `profiles` is preserved as-is; we only add a `role` column (required
--     for admin RLS in the next migration) and a CHECK constraint on it.
--   - Existing tables (user_skills, skill_gaps, roadmaps, roadmap_phases,
--     roadmap_tasks, resume_analyses, assessments, interview_sessions,
--     readiness_history, activity_log) are left untouched structurally;
--     we only add missing CHECK constraints and indexes to them.
--   - All net-new tables use `create table if not exists` so re-running
--     this file is a no-op on a database that already has them.
--
-- Run order: apply this file, then 20260813000002_rls_policies.sql.
-- ============================================================================

begin;

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 0. profiles: add role column (needed for admin-only RLS in next migration)
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'student';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('student', 'admin'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. resumes — the uploaded file record itself, versioned per user
-- ----------------------------------------------------------------------------

create table if not exists public.resumes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_name text,
  mime_type text,
  file_size_bytes int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resumes_status_idx on public.resumes(is_active);

-- one active resume per user
create unique index if not exists resumes_one_active_per_user_idx
  on public.resumes(user_id) where (is_active = true);

-- ----------------------------------------------------------------------------
-- 2. resume_analyses — add CHECK + index (table already exists)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'resume_analyses_score_check'
  ) then
    alter table public.resume_analyses
      add constraint resume_analyses_score_check check (score is null or (score >= 0 and score <= 100));
  end if;
end $$;

alter table public.resume_analyses
  add column if not exists resume_id uuid references public.resumes(id) on delete set null;

create index if not exists resume_analyses_user_id_idx on public.resume_analyses(user_id);

-- ----------------------------------------------------------------------------
-- 3. user_skills — add CHECK + status enum + indexes (table already exists)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_skills_score_check'
  ) then
    alter table public.user_skills
      add constraint user_skills_score_check check (current_score >= 0 and current_score <= 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'user_skills_confidence_check'
  ) then
    alter table public.user_skills
      add constraint user_skills_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 100));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'user_skills_status_check'
  ) then
    alter table public.user_skills
      add constraint user_skills_status_check check (status in ('unverified', 'verified', 'in_progress'));
  end if;
end $$;

create index if not exists user_skills_user_id_idx on public.user_skills(user_id);
create index if not exists user_skills_skill_name_idx on public.user_skills(skill_name);

-- ----------------------------------------------------------------------------
-- 4. skill_requirements — canonical role -> skill -> required score reference
-- ----------------------------------------------------------------------------

create table if not exists public.skill_requirements (
  id uuid primary key default uuid_generate_v4(),
  career_role text not null,
  skill_name text not null,
  category text,
  required_score int not null default 80,
  weight numeric(4,2) not null default 1.0,
  source text default 'ai_generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_requirements_score_check check (required_score >= 0 and required_score <= 100),
  constraint skill_requirements_weight_check check (weight >= 0 and weight <= 10),
  unique (career_role, skill_name)
);

create index if not exists skill_requirements_career_role_idx on public.skill_requirements(career_role);
create index if not exists skill_requirements_skill_name_idx on public.skill_requirements(skill_name);

-- ----------------------------------------------------------------------------
-- 5. skill_gaps — add CHECKs (table already exists)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skill_gaps_current_score_check'
  ) then
    alter table public.skill_gaps
      add constraint skill_gaps_current_score_check check (current_score >= 0 and current_score <= 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'skill_gaps_required_score_check'
  ) then
    alter table public.skill_gaps
      add constraint skill_gaps_required_score_check check (required_score >= 0 and required_score <= 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'skill_gaps_priority_check'
  ) then
    alter table public.skill_gaps
      add constraint skill_gaps_priority_check check (priority in ('low', 'medium', 'high', 'critical'));
  end if;
end $$;

create index if not exists skill_gaps_user_id_idx on public.skill_gaps(user_id);
create index if not exists skill_gaps_skill_name_idx on public.skill_gaps(skill_name);

-- ----------------------------------------------------------------------------
-- 6. readiness_scores — current snapshot (distinct from readiness_history)
-- ----------------------------------------------------------------------------

create table if not exists public.readiness_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  overall_score int not null default 0,
  dsa_score int default 0,
  dev_score int default 0,
  cs_score int default 0,
  projects_score int default 0,
  interview_score int default 0,
  resume_score int default 0,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint readiness_scores_overall_check check (overall_score >= 0 and overall_score <= 100),
  constraint readiness_scores_dsa_check check (dsa_score >= 0 and dsa_score <= 100),
  constraint readiness_scores_dev_check check (dev_score >= 0 and dev_score <= 100),
  constraint readiness_scores_cs_check check (cs_score >= 0 and cs_score <= 100),
  constraint readiness_scores_projects_check check (projects_score >= 0 and projects_score <= 100),
  constraint readiness_scores_interview_check check (interview_score >= 0 and interview_score <= 100),
  constraint readiness_scores_resume_check check (resume_score >= 0 and resume_score <= 100)
);

create index if not exists readiness_scores_user_id_idx on public.readiness_scores(user_id);

-- ----------------------------------------------------------------------------
-- 7. readiness_history — add CHECKs (table already exists)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'readiness_history_score_check') then
    alter table public.readiness_history add constraint readiness_history_score_check check (score is null or (score >= 0 and score <= 100));
  end if;
end $$;

create index if not exists readiness_history_user_id_idx on public.readiness_history(user_id);

-- ----------------------------------------------------------------------------
-- 8. roadmaps — extend to support one ACTIVE roadmap per (user, role)
--    instead of a hard 1-roadmap-per-user-ever limit
-- ----------------------------------------------------------------------------

alter table public.roadmaps
  add column if not exists career_role text,
  add column if not exists status text not null default 'active';

update public.roadmaps set career_role = coalesce(career_role, target_career, 'unspecified') where career_role is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'roadmaps_status_check') then
    alter table public.roadmaps add constraint roadmaps_status_check check (status in ('active', 'archived', 'completed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'roadmaps_readiness_check') then
    alter table public.roadmaps add constraint roadmaps_readiness_check check (current_readiness >= 0 and current_readiness <= 100);
  end if;
end $$;

-- drop the old "one roadmap per user, ever" unique constraint if present,
-- replace with "one ACTIVE roadmap per user+role" partial unique index
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.roadmaps'::regclass
      and contype = 'u'
  loop
    execute format('alter table public.roadmaps drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists roadmaps_one_active_per_user_role_idx
  on public.roadmaps(user_id, career_role) where (status = 'active');

create index if not exists roadmaps_user_id_idx on public.roadmaps(user_id);
create index if not exists roadmaps_career_role_idx on public.roadmaps(career_role);
create index if not exists roadmaps_status_idx on public.roadmaps(status);

-- ----------------------------------------------------------------------------
-- 9. roadmap_tasks — add a direct roadmap_id + status enum for easier
--    querying, on top of the existing phase_id linkage (non-breaking)
-- ----------------------------------------------------------------------------

alter table public.roadmap_tasks
  add column if not exists roadmap_id uuid references public.roadmaps(id) on delete cascade,
  add column if not exists status text not null default 'pending';

update public.roadmap_tasks rt
set roadmap_id = rp.roadmap_id
from public.roadmap_phases rp
where rt.phase_id = rp.id and rt.roadmap_id is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'roadmap_tasks_status_check') then
    alter table public.roadmap_tasks add constraint roadmap_tasks_status_check check (status in ('pending', 'in_progress', 'done'));
  end if;
end $$;

create index if not exists roadmap_tasks_roadmap_id_idx on public.roadmap_tasks(roadmap_id);
create index if not exists roadmap_tasks_phase_id_idx on public.roadmap_tasks(phase_id);
create index if not exists roadmap_tasks_status_idx on public.roadmap_tasks(status);

-- ----------------------------------------------------------------------------
-- 10. recommendations — persist AI-generated recommendations (currently
--     generated but never saved by generate-recommendations Edge Function)
-- ----------------------------------------------------------------------------

create table if not exists public.recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  related_skill text,
  priority text not null default 'medium',
  status text not null default 'pending',
  source text default 'ai_generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendations_priority_check check (priority in ('low', 'medium', 'high', 'critical')),
  constraint recommendations_status_check check (status in ('pending', 'accepted', 'dismissed', 'completed'))
);

create index if not exists recommendations_user_id_idx on public.recommendations(user_id);
create index if not exists recommendations_status_idx on public.recommendations(status);

-- ----------------------------------------------------------------------------
-- 11. assessments — add CHECK (table already exists)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assessments_score_check') then
    alter table public.assessments add constraint assessments_score_check check (score is null or (score >= 0 and score <= 100));
  end if;
end $$;

create index if not exists assessments_user_id_idx on public.assessments(user_id);
create index if not exists assessments_skill_name_idx on public.assessments(skill_name);

-- ----------------------------------------------------------------------------
-- 12. interviews — new table, distinct name from existing interview_sessions
--     (kept alongside interview_sessions rather than renaming, to avoid a
--     breaking change to the live evaluate-interview / generate-questions
--     functions; consolidate in a follow-up migration once callers move over)
-- ----------------------------------------------------------------------------

create table if not exists public.interviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.interview_sessions(id) on delete set null,
  mode text default 'mixed',
  difficulty text default 'medium',
  status text not null default 'in_progress',
  overall_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interviews_score_check check (overall_score is null or (overall_score >= 0 and overall_score <= 100)),
  constraint interviews_status_check check (status in ('in_progress', 'completed', 'abandoned'))
);

create index if not exists interviews_user_id_idx on public.interviews(user_id);
create index if not exists interviews_status_idx on public.interviews(status);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'interview_sessions_score_check') then
    alter table public.interview_sessions add constraint interview_sessions_score_check check (overall_score >= 0 and overall_score <= 100);
  end if;
end $$;

create index if not exists interview_sessions_user_id_idx on public.interview_sessions(user_id);

-- ----------------------------------------------------------------------------
-- 13. processing_jobs — async job tracking for resume parsing / roadmap gen
-- ----------------------------------------------------------------------------

create table if not exists public.processing_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  input jsonb default '{}',
  output jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint processing_jobs_type_check check (job_type in
    ('resume_analysis', 'gap_calculation', 'roadmap_generation', 'recommendation_generation', 'interview_evaluation')),
  constraint processing_jobs_status_check check (status in ('queued', 'running', 'completed', 'failed'))
);

create index if not exists processing_jobs_user_id_idx on public.processing_jobs(user_id);
create index if not exists processing_jobs_status_idx on public.processing_jobs(status);

-- ----------------------------------------------------------------------------
-- 14. evidence_records — links a skill/score claim back to its source
-- ----------------------------------------------------------------------------

create table if not exists public.evidence_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  source_type text not null,
  source_id uuid,
  excerpt text,
  confidence int,
  created_at timestamptz not null default now(),
  constraint evidence_records_source_type_check check (source_type in
    ('resume', 'assessment', 'interview', 'github', 'manual')),
  constraint evidence_records_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 100))
);

create index if not exists evidence_records_user_id_idx on public.evidence_records(user_id);
create index if not exists evidence_records_skill_name_idx on public.evidence_records(skill_name);

-- ----------------------------------------------------------------------------
-- 15. data_conflicts — records disagreement between signals for a skill
-- ----------------------------------------------------------------------------

create table if not exists public.data_conflicts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  claimed_source text not null,
  claimed_value text,
  verified_source text not null,
  verified_value text,
  status text not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint data_conflicts_status_check check (status in ('open', 'resolved', 'ignored'))
);

create index if not exists data_conflicts_user_id_idx on public.data_conflicts(user_id);
create index if not exists data_conflicts_status_idx on public.data_conflicts(status);

-- ----------------------------------------------------------------------------
-- 16. admin_audit_logs — audit trail for admin-role actions
-- ----------------------------------------------------------------------------

create table if not exists public.admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_id_idx on public.admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_target_table_idx on public.admin_audit_logs(target_table);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- 17. Enable RLS on every new table now (policies themselves are defined in
--     20260813000002_rls_policies.sql, but RLS must be ON immediately so
--     there is never a window where these tables are open by default)
-- ----------------------------------------------------------------------------

alter table public.resumes enable row level security;
alter table public.skill_requirements enable row level security;
alter table public.readiness_scores enable row level security;
alter table public.recommendations enable row level security;
alter table public.interviews enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.evidence_records enable row level security;
alter table public.data_conflicts enable row level security;
alter table public.admin_audit_logs enable row level security;

-- updated_at triggers for new tables that have the column
-- (public.update_updated_at() already exists from 001_schema.sql)
create trigger resumes_updated_at before update on public.resumes
  for each row execute function public.update_updated_at();
create trigger resume_analyses_updated_at_ck before update on public.resume_analyses
  for each row execute function public.update_updated_at();
create trigger skill_requirements_updated_at before update on public.skill_requirements
  for each row execute function public.update_updated_at();
create trigger readiness_scores_updated_at before update on public.readiness_scores
  for each row execute function public.update_updated_at();
create trigger roadmap_tasks_updated_at before update on public.roadmap_tasks
  for each row execute function public.update_updated_at();
create trigger recommendations_updated_at before update on public.recommendations
  for each row execute function public.update_updated_at();
create trigger interviews_updated_at before update on public.interviews
  for each row execute function public.update_updated_at();
create trigger processing_jobs_updated_at before update on public.processing_jobs
  for each row execute function public.update_updated_at();

commit;

-- ============================================================================
-- DOWN / ROLLBACK
-- Run this section (as its own script) to fully revert this migration.
-- Ordered to respect FK dependencies (children before parents).
-- ============================================================================

-- begin;
--
-- drop trigger if exists processing_jobs_updated_at on public.processing_jobs;
-- drop trigger if exists interviews_updated_at on public.interviews;
-- drop trigger if exists recommendations_updated_at on public.recommendations;
-- drop trigger if exists roadmap_tasks_updated_at on public.roadmap_tasks;
-- drop trigger if exists readiness_scores_updated_at on public.readiness_scores;
-- drop trigger if exists skill_requirements_updated_at on public.skill_requirements;
-- drop trigger if exists resume_analyses_updated_at_ck on public.resume_analyses;
-- drop trigger if exists resumes_updated_at on public.resumes;
--
-- drop table if exists public.admin_audit_logs;
-- drop table if exists public.data_conflicts;
-- drop table if exists public.evidence_records;
-- drop table if exists public.processing_jobs;
-- drop table if exists public.interviews;
-- drop table if exists public.recommendations;
-- drop table if exists public.readiness_scores;
-- drop table if exists public.skill_requirements;
-- drop table if exists public.resumes;
--
-- alter table public.roadmap_tasks drop constraint if exists roadmap_tasks_status_check;
-- drop index if exists public.roadmap_tasks_status_idx;
-- drop index if exists public.roadmap_tasks_phase_id_idx;
-- drop index if exists public.roadmap_tasks_roadmap_id_idx;
-- alter table public.roadmap_tasks drop column if exists status;
-- alter table public.roadmap_tasks drop column if exists roadmap_id;
--
-- drop index if exists public.roadmaps_status_idx;
-- drop index if exists public.roadmaps_career_role_idx;
-- drop index if exists public.roadmaps_user_id_idx;
-- drop index if exists public.roadmaps_one_active_per_user_role_idx;
-- alter table public.roadmaps drop constraint if exists roadmaps_readiness_check;
-- alter table public.roadmaps drop constraint if exists roadmaps_status_check;
-- alter table public.roadmaps drop column if exists status;
-- alter table public.roadmaps drop column if exists career_role;
-- -- NOTE: this does NOT restore the original unique(user_id) constraint;
-- -- re-add manually if you must revert to "one roadmap per user, ever":
-- -- alter table public.roadmaps add constraint roadmaps_user_id_key unique (user_id);
--
-- drop index if exists public.readiness_history_user_id_idx;
-- alter table public.readiness_history drop constraint if exists readiness_history_score_check;
--
-- alter table public.skill_gaps drop constraint if exists skill_gaps_priority_check;
-- alter table public.skill_gaps drop constraint if exists skill_gaps_required_score_check;
-- alter table public.skill_gaps drop constraint if exists skill_gaps_current_score_check;
-- drop index if exists public.skill_gaps_skill_name_idx;
-- drop index if exists public.skill_gaps_user_id_idx;
--
-- alter table public.user_skills drop constraint if exists user_skills_status_check;
-- alter table public.user_skills drop constraint if exists user_skills_confidence_check;
-- alter table public.user_skills drop constraint if exists user_skills_score_check;
-- drop index if exists public.user_skills_skill_name_idx;
-- drop index if exists public.user_skills_user_id_idx;
--
-- alter table public.resume_analyses drop constraint if exists resume_analyses_score_check;
-- alter table public.resume_analyses drop column if exists resume_id;
-- drop index if exists public.resume_analyses_user_id_idx;
--
-- alter table public.assessments drop constraint if exists assessments_score_check;
-- drop index if exists public.assessments_user_id_idx;
-- drop index if exists public.assessments_skill_name_idx;
--
-- alter table public.interview_sessions drop constraint if exists interview_sessions_score_check;
-- drop index if exists public.interview_sessions_user_id_idx;
--
-- alter table public.profiles drop constraint if exists profiles_role_check;
-- alter table public.profiles drop column if exists role;
--
-- commit;
-- ============================================================================
