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
