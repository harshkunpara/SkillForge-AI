-- Up migration
-- Adds the tables/columns Part 3 (skill verification & readiness engine)
-- needs on top of the existing 001_schema.sql / 002_profile_extended.sql.
-- Nothing here renames or removes existing columns.

-- Evidence records: one row per piece of evidence backing a user_skills entry.
create table public.evidence_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.user_skills(id) on delete cascade,
  source text not null check (source in (
    'resume_mention', 'resume_project', 'github_repo',
    'assessment_result', 'interview_result'
  )),
  evidence_text text,
  score numeric, -- e.g. assessment/interview score at time of evidence, if applicable
  created_at timestamptz default now()
);

create index evidence_records_user_skill_idx on public.evidence_records(user_id, skill_id);
create index evidence_records_source_idx on public.evidence_records(source);

alter table public.evidence_records enable row level security;

create policy "Users can view own evidence" on public.evidence_records
  for select using (auth.uid() = user_id);
create policy "Users can insert own evidence" on public.evidence_records
  for insert with check (auth.uid() = user_id);

-- Skill requirements: what a target_career expects, used to (re)build skill_gaps.
create table public.skill_requirements (
  id uuid primary key default uuid_generate_v4(),
  career_role text not null,
  skill_name text not null,
  required_level int not null check (required_level between 0 and 100),
  category text,
  created_at timestamptz default now(),
  unique(career_role, skill_name)
);

-- Requirements are reference data, readable by any authenticated user
-- (needed so recalculate_skill_gaps can run under a user's own session too).
alter table public.skill_requirements enable row level security;
create policy "Authenticated users can read skill requirements" on public.skill_requirements
  for select using (auth.role() = 'authenticated');

-- skill_gaps: add a status column. (current_score/required_score/gap/priority
-- already exist from 001_schema.sql; gap is a generated column, left as-is.)
alter table public.skill_gaps
  add column if not exists status text default 'open'
    check (status in ('open', 'closed', 'assessment_required'));

-- readiness_history: add the explainable-breakdown + status fields.
-- Existing dsa_score/dev_score/cs_score/projects_score are left untouched
-- (unused by this engine; existing resume_score/interview_score columns
-- keep storing the raw 0-100 source values as before).
alter table public.readiness_history
  add column if not exists readiness_status text
    check (readiness_status in ('complete', 'incomplete')),
  add column if not exists skill_match_component numeric,
  add column if not exists resume_quality_component numeric,
  add column if not exists assessment_component numeric,
  add column if not exists interview_component numeric,
  add column if not exists missing_inputs text[];

-- Down migration
-- alter table public.readiness_history
--   drop column if exists readiness_status,
--   drop column if exists skill_match_component,
--   drop column if exists resume_quality_component,
--   drop column if exists assessment_component,
--   drop column if exists interview_component,
--   drop column if exists missing_inputs;
-- alter table public.skill_gaps drop column if exists status;
-- drop policy if exists "Authenticated users can read skill requirements" on public.skill_requirements;
-- drop table if exists public.skill_requirements;
-- drop policy if exists "Users can insert own evidence" on public.evidence_records;
-- drop policy if exists "Users can view own evidence" on public.evidence_records;
-- drop table if exists public.evidence_records;
