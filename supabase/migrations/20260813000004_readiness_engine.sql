-- Up migration
-- Adds the tables/columns Part 3 (skill verification & readiness engine)
-- needs on top of the existing 001_schema.sql / 002_profile_extended.sql.
-- Nothing here renames or removes existing columns.

-- Tables and policies already created in 001_foundation.sql

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
-- Up migration

create or replace function public.calculate_skill_confidence(
  p_skill_name text,
  p_user_id uuid
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill_id uuid;
  v_score numeric := 0;
  v_resume_mention_count int := 0;
  v_resume_project_count int := 0;
  v_github_count int := 0;
  v_assessment_pass_count int := 0;
  v_interview_count int := 0;
  v_evidence_types int := 0;
  v_status text;
  v_confidence_int int;
begin
  select id into v_skill_id
  from public.user_skills
  where user_id = p_user_id and skill_name = p_skill_name
  limit 1;

  if v_skill_id is null then
    return null;
  end if;

  -- resume_mention: +0.15 (flat, applies once if any exist)
  select count(*) into v_resume_mention_count
  from public.evidence_records
  where skill_id = v_skill_id and user_id = p_user_id and source = 'resume_mention';

  if v_resume_mention_count > 0 then
    v_score := v_score + 0.15;
  end if;

  -- resume_project: +0.20 (flat, applies once if any exist)
  select count(*) into v_resume_project_count
  from public.evidence_records
  where skill_id = v_skill_id and user_id = p_user_id and source = 'resume_project';

  if v_resume_project_count > 0 then
    v_score := v_score + 0.20;
  end if;

  -- github_repo: +0.15 per repo, capped at +0.30 total
  select count(*) into v_github_count
  from public.evidence_records
  where skill_id = v_skill_id and user_id = p_user_id and source = 'github_repo';

  v_score := v_score + least(v_github_count * 0.15, 0.30);

  -- assessment_result: +0.25 if any assessment for this skill scored >= 70
  select count(*) into v_assessment_pass_count
  from public.assessments
  where user_id = p_user_id and skill_name = p_skill_name and score >= 70;

  if v_assessment_pass_count > 0 then
    v_score := v_score + 0.25;
  end if;

  -- interview_result: +0.15 (flat, applies once if any exist)
  select count(*) into v_interview_count
  from public.evidence_records
  where skill_id = v_skill_id and user_id = p_user_id and source = 'interview_result';

  if v_interview_count > 0 then
    v_score := v_score + 0.15;
  end if;

  -- Cap at 1.0
  v_score := least(v_score, 1.0);

  -- user_skills.confidence is an int column -> store as 0-100
  v_confidence_int := round(v_score * 100);

  -- Determine status (reuses existing user_skills.status column,
  -- which already defaults to 'unverified')
  v_evidence_types := (case when v_resume_mention_count > 0 then 1 else 0 end)
    + (case when v_resume_project_count > 0 then 1 else 0 end)
    + (case when v_github_count > 0 then 1 else 0 end)
    + (case when v_assessment_pass_count > 0 then 1 else 0 end)
    + (case when v_interview_count > 0 then 1 else 0 end);

  if v_assessment_pass_count > 0 or v_interview_count > 0 then
    v_status := 'verified';
  elsif v_evidence_types >= 2 then
    v_status := 'partially_verified';
  elsif v_evidence_types = 1 then
    v_status := 'self_reported';
  else
    v_status := 'unverified';
  end if;

  update public.user_skills
  set confidence = v_confidence_int,
      status = v_status,
      updated_at = now()
  where id = v_skill_id;

  return v_confidence_int;
end;
$$;

-- Down migration
-- drop function if exists public.calculate_skill_confidence(text, uuid);
-- Up migration

create or replace function public.recalculate_skill_gaps(
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_career text;
  r record;
  v_current_score int;
  v_status text;
  v_priority text;
begin
  select target_career into v_target_career
  from public.profiles
  where id = p_user_id;

  if v_target_career is null then
    return;
  end if;

  for r in
    select skill_name, required_score as required_level, category
    from public.skill_requirements
    where career_role = v_target_career
  loop
    select current_score into v_current_score
    from public.user_skills
    where user_id = p_user_id and skill_name = r.skill_name
    limit 1;

    if v_current_score is null then
      v_status := 'assessment_required';
      v_priority := case when r.required_level >= 70 then 'critical' else 'high' end;
      v_current_score := 0; -- skill_gaps.gap is a generated column requiring a numeric current_score
    else
      if greatest(0, r.required_level - v_current_score) = 0 then
        v_status := 'closed';
        v_priority := 'low';
      else
        v_status := 'open';
        v_priority := case
          when (r.required_level - v_current_score) >= 40 then 'critical'
          when (r.required_level - v_current_score) >= 20 then 'high'
          when (r.required_level - v_current_score) >= 10 then 'medium'
          else 'low'
        end;
      end if;
    end if;

    insert into public.skill_gaps (
      user_id, skill_name, current_score, required_score,
      status, priority, updated_at
    )
    values (
      p_user_id, r.skill_name, v_current_score, r.required_level,
      v_status, v_priority, now()
    )
    on conflict (user_id, skill_name)
    do update set
      current_score = excluded.current_score,
      required_score = excluded.required_score,
      status = excluded.status,
      priority = excluded.priority,
      updated_at = now();
  end loop;

  -- Skills that were required before but are no longer part of this career's
  -- requirements would otherwise stay in skill_gaps indefinitely. Clean those up.
  delete from public.skill_gaps
  where user_id = p_user_id
    and skill_name not in (
      select skill_name from public.skill_requirements where career_role = v_target_career
    );
end;
$$;

-- Down migration
-- drop function if exists public.recalculate_skill_gaps(uuid);
-- Up migration

create or replace function public.calculate_readiness(
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_career text;
  v_total_required int := 0;
  v_closed_gaps int := 0;
  v_assessment_required int := 0;
  v_missing_inputs text[];

  v_latest_resume_score numeric;
  v_avg_assessment_score numeric;
  v_latest_interview_score numeric;

  v_skill_match numeric := 0;
  v_resume_quality numeric := 0;
  v_assessment_component numeric := 0;
  v_interview_component numeric := 0;

  v_readiness_score numeric;
  v_readiness_status text;
begin
  select target_career into v_target_career
  from public.profiles
  where id = p_user_id;

  if v_target_career is null then
    return;
  end if;

  select
    count(*),
    count(*) filter (where status = 'closed'),
    count(*) filter (where status = 'assessment_required')
  into v_total_required, v_closed_gaps, v_assessment_required
  from public.skill_gaps
  where user_id = p_user_id;

  if v_total_required = 0 then
    return;
  end if;

  select array_agg(skill_name)
  into v_missing_inputs
  from public.skill_gaps
  where user_id = p_user_id and status = 'assessment_required';

  -- Always fetch raw source values so they can be shown even when incomplete
  select score into v_latest_resume_score
  from public.resume_analyses
  where user_id = p_user_id
  order by created_at desc
  limit 1;

  select avg(score) into v_avg_assessment_score
  from public.assessments
  where user_id = p_user_id;

  select overall_score into v_latest_interview_score
  from public.interview_sessions
  where user_id = p_user_id
  order by created_at desc
  limit 1;

  if v_assessment_required > 0 then
    v_readiness_status := 'incomplete';
    v_readiness_score := null;

    insert into public.readiness_history (
      user_id, score, resume_score, interview_score,
      readiness_status, missing_inputs, recorded_at
    )
    values (
      p_user_id, null, v_latest_resume_score, v_latest_interview_score,
      v_readiness_status, v_missing_inputs, now()
    );

    -- Do not touch profiles.placement_readiness while incomplete â€”
    -- leave the last known complete value in place.
    return;
  end if;

  -- verified_skill_match: up to 50 pts
  v_skill_match := (v_closed_gaps::numeric / v_total_required) * 50;

  -- resume_quality: up to 30 pts
  v_resume_quality := coalesce(v_latest_resume_score, 0) / 100 * 30;

  -- assessment_score: up to 20 pts
  v_assessment_component := coalesce(v_avg_assessment_score, 0) / 100 * 20;

  -- interview_score: "remaining" points, per spec. With skill match(50) +
  -- resume(30) + assessment(20) already totalling 100, remaining is 0 today.
  -- FLAG: this makes interview performance never affect the score. If you
  -- want interviews to count, tell us the real split (e.g. 40/25/15/20) and
  -- this block gets a nonzero weight â€” everything else stays the same.
  if v_latest_interview_score is not null then
    v_interview_component := (v_latest_interview_score / 100) * (100 - 50 - 30 - 20);
  else
    v_interview_component := 0;
  end if;

  v_readiness_score := v_skill_match + v_resume_quality + v_assessment_component + v_interview_component;
  v_readiness_status := 'complete';

  insert into public.readiness_history (
    user_id, score, resume_score, interview_score,
    readiness_status, skill_match_component, resume_quality_component,
    assessment_component, interview_component, missing_inputs, recorded_at
  )
  values (
    p_user_id, v_readiness_score, v_latest_resume_score, v_latest_interview_score,
    v_readiness_status, v_skill_match, v_resume_quality,
    v_assessment_component, v_interview_component, null, now()
  );

  update public.profiles
  set placement_readiness = round(v_readiness_score),
      resume_score = v_latest_resume_score,
      updated_at = now()
  where id = p_user_id;
end;
$$;

-- Down migration
-- drop function if exists public.calculate_readiness(uuid);
