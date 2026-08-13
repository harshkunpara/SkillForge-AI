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

    -- Do not touch profiles.placement_readiness while incomplete —
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
  -- this block gets a nonzero weight — everything else stays the same.
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
