-- Phase 3 Adjustment: Fix calculate_skill_confidence & adjust roadmap_tasks check constraints

-- 1. Fix public.calculate_skill_confidence
CREATE OR REPLACE FUNCTION public.calculate_skill_confidence(
  p_skill_name text,
  p_user_id uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := clock_timestamp();
  v_request_id text := gen_random_uuid()::text;
  v_skill_id uuid;
  v_score numeric := 0;
  v_resume_mention_count int := 0;
  v_resume_project_count int := 0;
  v_github_count int := 0;
  v_evidence_records_exist int := 0;
  v_assessment_pass_count int := 0;
  v_interview_count int := 0;
  v_evidence_types int := 0;
  v_status text;
  v_confidence_int int;
BEGIN
  PERFORM public.log_system_event(
    'info',
    'calculate_skill_confidence',
    'Skill confidence calculation started',
    jsonb_build_object('user_id', p_user_id, 'skill_name', p_skill_name),
    'calculation_started',
    v_request_id,
    p_user_id
  );

  SELECT id INTO v_skill_id
  FROM public.user_skills
  WHERE user_id = p_user_id AND skill_name = p_skill_name
  LIMIT 1;

  IF v_skill_id IS NULL THEN
    PERFORM public.log_system_event(
      'warn',
      'calculate_skill_confidence',
      'User does not have the specified skill',
      jsonb_build_object('user_id', p_user_id, 'skill_name', p_skill_name),
      'calculation_warning',
      v_request_id,
      p_user_id
    );
    RETURN null;
  END IF;

  -- resume_mention (represented by source_type = 'resume')
  SELECT count(*) INTO v_resume_mention_count
  FROM public.evidence_records
  WHERE skill_name = p_skill_name AND user_id = p_user_id AND source_type = 'resume';

  IF v_resume_mention_count > 0 THEN
    v_score := v_score + 0.15;
  END IF;

  -- resume_project (also resume source type)
  SELECT count(*) INTO v_resume_project_count
  FROM public.evidence_records
  WHERE skill_name = p_skill_name AND user_id = p_user_id AND source_type = 'resume' AND excerpt LIKE '%project%';

  IF v_resume_project_count > 0 THEN
    v_score := v_score + 0.20;
  END IF;

  -- github_repo (source_type = 'github')
  SELECT count(*) INTO v_github_count
  FROM public.evidence_records
  WHERE skill_name = p_skill_name AND user_id = p_user_id AND source_type = 'github';

  v_score := v_score + least(v_github_count * 0.15, 0.30);

  -- assessment_result (source_type = 'assessment')
  -- also check assessments table
  SELECT count(*) INTO v_assessment_pass_count
  FROM public.assessments
  WHERE user_id = p_user_id AND skill_name = p_skill_name AND score >= 70;

  IF v_assessment_pass_count > 0 THEN
    v_score := v_score + 0.25;
  END IF;

  -- interview_result (source_type = 'interview')
  SELECT count(*) INTO v_interview_count
  FROM public.evidence_records
  WHERE skill_name = p_skill_name AND user_id = p_user_id AND source_type = 'interview';

  IF v_interview_count > 0 THEN
    v_score := v_score + 0.15;
  END IF;

  v_score := least(v_score, 1.0);
  v_confidence_int := round(v_score * 100);

  v_evidence_types := (CASE WHEN v_resume_mention_count > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN v_resume_project_count > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN v_github_count > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN v_assessment_pass_count > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN v_interview_count > 0 THEN 1 ELSE 0 END);

  IF v_assessment_pass_count > 0 OR v_interview_count > 0 THEN
    v_status := 'verified';
  ELSIF v_evidence_types >= 2 THEN
    v_status := 'partially_verified';
  ELSIF v_evidence_types = 1 THEN
    v_status := 'self_reported';
  ELSE
    v_status := 'unverified';
  END IF;

  UPDATE public.user_skills
  SET confidence = v_confidence_int,
      status = v_status,
      updated_at = now()
  WHERE id = v_skill_id;

  PERFORM public.log_system_event(
    'info',
    'calculate_skill_confidence',
    'Skill confidence calculation completed',
    jsonb_build_object('confidence', v_confidence_int, 'status', v_status),
    'calculation_completed',
    v_request_id,
    p_user_id,
    null,
    extract(milliseconds from clock_timestamp() - v_started_at)::integer
  );

  RETURN v_confidence_int;

EXCEPTION
  WHEN others THEN
    PERFORM public.log_system_event(
      'critical',
      'calculate_skill_confidence',
      'Unexpected failure in skill confidence calculation',
      jsonb_build_object('sqlstate', sqlstate, 'error', sqlerrm),
      'calculation_failed',
      v_request_id,
      p_user_id
    );
    RAISE;
END;
$$;

-- 2. Adjust roadmap_tasks constraints and columns
ALTER TABLE public.roadmap_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.roadmap_tasks ADD COLUMN IF NOT EXISTS skill_name text;

ALTER TABLE public.roadmap_tasks DROP CONSTRAINT IF EXISTS roadmap_tasks_status_check;
ALTER TABLE public.roadmap_tasks ADD CONSTRAINT roadmap_tasks_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'done'::text]));
