-- Phase 3: Modify existing calculation functions with robust logging and error handling

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

  -- resume_mention: +0.15
  SELECT count(*) INTO v_resume_mention_count
  FROM public.evidence_records
  WHERE skill_id = v_skill_id AND user_id = p_user_id AND source_type = 'resume_mention';

  IF v_resume_mention_count > 0 THEN
    v_score := v_score + 0.15;
  END IF;

  -- resume_project: +0.20
  SELECT count(*) INTO v_resume_project_count
  FROM public.evidence_records
  WHERE skill_id = v_skill_id AND user_id = p_user_id AND source_type = 'resume_project';

  IF v_resume_project_count > 0 THEN
    v_score := v_score + 0.20;
  END IF;

  -- github_repo: +0.15 per repo, capped at 0.30
  SELECT count(*) INTO v_github_count
  FROM public.evidence_records
  WHERE skill_id = v_skill_id AND user_id = p_user_id AND source_type = 'github_repo';

  v_score := v_score + least(v_github_count * 0.15, 0.30);

  -- assessment_result: +0.25 if score >= 70
  SELECT count(*) INTO v_assessment_pass_count
  FROM public.assessments
  WHERE user_id = p_user_id AND skill_name = p_skill_name AND score >= 70;

  IF v_assessment_pass_count > 0 THEN
    v_score := v_score + 0.25;
  END IF;

  -- interview_result: +0.15
  SELECT count(*) INTO v_interview_count
  FROM public.evidence_records
  WHERE skill_id = v_skill_id AND user_id = p_user_id AND source_type = 'interview_result';

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
  WHEN foreign_key_violation THEN
    PERFORM public.log_system_event(
      'error',
      'calculate_skill_confidence',
      'Foreign key violation in skill confidence calculation',
      jsonb_build_object('sqlstate', sqlstate, 'error', sqlerrm),
      'calculation_failed',
      v_request_id,
      p_user_id
    );
    RAISE;
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


CREATE OR REPLACE FUNCTION public.recalculate_skill_gaps(
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := clock_timestamp();
  v_request_id text := gen_random_uuid()::text;
  v_target_career text;
  r record;
  v_current_score int;
  v_status text;
  v_priority text;
BEGIN
  PERFORM public.log_system_event(
    'info',
    'recalculate_skill_gaps',
    'Skill gap recalculation started',
    jsonb_build_object('user_id', p_user_id),
    'calculation_started',
    v_request_id,
    p_user_id
  );

  SELECT target_career INTO v_target_career
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_career IS NULL THEN
    PERFORM public.log_system_event(
      'warn',
      'recalculate_skill_gaps',
      'User profile has no target career role set',
      jsonb_build_object('user_id', p_user_id),
      'calculation_warning',
      v_request_id,
      p_user_id
    );
    RETURN;
  END IF;

  FOR r IN
    SELECT skill_name, required_score as required_level, category
    FROM public.skill_requirements
    WHERE career_role = v_target_career
  LOOP
    SELECT current_score INTO v_current_score
    FROM public.user_skills
    WHERE user_id = p_user_id AND skill_name = r.skill_name
    LIMIT 1;

    IF v_current_score IS NULL THEN
      v_status := 'assessment_required';
      v_priority := CASE WHEN r.required_level >= 70 THEN 'critical' ELSE 'high' END;
      v_current_score := 0;
    ELSE
      IF greatest(0, r.required_level - v_current_score) = 0 THEN
        v_status := 'closed';
        v_priority := 'low';
      ELSE
        v_status := 'open';
        v_priority := CASE
          WHEN (r.required_level - v_current_score) >= 40 THEN 'critical'
          WHEN (r.required_level - v_current_score) >= 20 THEN 'high'
          WHEN (r.required_level - v_current_score) >= 10 THEN 'medium'
          ELSE 'low'
        END;
      END IF;
    END IF;

    INSERT INTO public.skill_gaps (
      user_id, skill_name, current_score, required_score,
      status, priority, updated_at
    )
    VALUES (
      p_user_id, r.skill_name, v_current_score, r.required_level,
      v_status, v_priority, now()
    )
    ON CONFLICT (user_id, skill_name)
    DO UPDATE SET
      current_score = excluded.current_score,
      required_score = excluded.required_score,
      status = excluded.status,
      priority = excluded.priority,
      updated_at = now();
  END LOOP;

  DELETE FROM public.skill_gaps
  WHERE user_id = p_user_id
    AND skill_name NOT IN (
      SELECT skill_name FROM public.skill_requirements WHERE career_role = v_target_career
    );

  PERFORM public.log_system_event(
    'info',
    'recalculate_skill_gaps',
    'Skill gap recalculation completed',
    jsonb_build_object('user_id', p_user_id),
    'calculation_completed',
    v_request_id,
    p_user_id,
    null,
    extract(milliseconds from clock_timestamp() - v_started_at)::integer
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    PERFORM public.log_system_event(
      'error',
      'recalculate_skill_gaps',
      'Foreign key violation in skill gap calculation',
      jsonb_build_object('sqlstate', sqlstate, 'error', sqlerrm),
      'calculation_failed',
      v_request_id,
      p_user_id
    );
    RAISE;
  WHEN others THEN
    PERFORM public.log_system_event(
      'critical',
      'recalculate_skill_gaps',
      'Unexpected failure in skill gap calculation',
      jsonb_build_object('sqlstate', sqlstate, 'error', sqlerrm),
      'calculation_failed',
      v_request_id,
      p_user_id
    );
    RAISE;
END;
$$;


CREATE OR REPLACE FUNCTION public.calculate_readiness(
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := clock_timestamp();
  v_request_id text := gen_random_uuid()::text;
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
BEGIN
  PERFORM public.log_system_event(
    'info',
    'calculate_readiness',
    'Readiness calculation started',
    jsonb_build_object('user_id', p_user_id),
    'calculation_started',
    v_request_id,
    p_user_id
  );

  SELECT target_career INTO v_target_career
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_career IS NULL THEN
    PERFORM public.log_system_event(
      'warn',
      'calculate_readiness',
      'User profile has no target career role set',
      jsonb_build_object('user_id', p_user_id),
      'calculation_warning',
      v_request_id,
      p_user_id
    );
    RETURN;
  END IF;

  SELECT
    count(*),
    count(*) filter (where status = 'closed'),
    count(*) filter (where status = 'assessment_required')
  INTO v_total_required, v_closed_gaps, v_assessment_required
  FROM public.skill_gaps
  WHERE user_id = p_user_id;

  IF v_total_required = 0 THEN
    PERFORM public.log_system_event(
      'warn',
      'calculate_readiness',
      'No required skills defined for user target career',
      jsonb_build_object('user_id', p_user_id, 'target_career', v_target_career),
      'calculation_warning',
      v_request_id,
      p_user_id
    );
    RETURN;
  END IF;

  SELECT array_agg(skill_name)
  INTO v_missing_inputs
  FROM public.skill_gaps
  WHERE user_id = p_user_id AND status = 'assessment_required';

  SELECT score INTO v_latest_resume_score
  FROM public.resume_analyses
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT avg(score) INTO v_avg_assessment_score
  FROM public.assessments
  WHERE user_id = p_user_id;

  SELECT overall_score INTO v_latest_interview_score
  FROM public.interview_sessions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_assessment_required > 0 THEN
    v_readiness_status := 'incomplete';
    v_readiness_score := null;

    INSERT INTO public.readiness_history (
      user_id, score, resume_score, interview_score,
      readiness_status, missing_inputs, recorded_at
    )
    VALUES (
      p_user_id, null, v_latest_resume_score, v_latest_interview_score,
      v_readiness_status, v_missing_inputs, now()
    );

    PERFORM public.log_system_event(
      'info',
      'calculate_readiness',
      'Readiness calculation set to incomplete due to missing assessments',
      jsonb_build_object('missing_inputs', v_missing_inputs),
      'calculation_incomplete',
      v_request_id,
      p_user_id
    );
    RETURN;
  END IF;

  -- Calculate scores
  v_skill_match := (v_closed_gaps::numeric / v_total_required) * 50;
  v_resume_quality := coalesce(v_latest_resume_score, 0) / 100 * 30;
  v_assessment_component := coalesce(v_avg_assessment_score, 0) / 100 * 20;

  IF v_latest_interview_score IS NOT NULL THEN
    v_interview_component := (v_latest_interview_score / 100) * (100 - 50 - 30 - 20);
  ELSE
    v_interview_component := 0;
  END IF;

  v_readiness_score := v_skill_match + v_resume_quality + v_assessment_component + v_interview_component;
  v_readiness_status := 'complete';

  INSERT INTO public.readiness_history (
    user_id, score, resume_score, interview_score,
    readiness_status, skill_match_component, resume_quality_component,
    assessment_component, interview_component, missing_inputs, recorded_at
  )
  VALUES (
    p_user_id, v_readiness_score, v_latest_resume_score, v_latest_interview_score,
    v_readiness_status, v_skill_match, v_resume_quality,
    v_assessment_component, v_interview_component, null, now()
  );

  UPDATE public.profiles
  SET placement_readiness = round(v_readiness_score),
      resume_score = v_latest_resume_score,
      updated_at = now()
  WHERE id = p_user_id;

  PERFORM public.log_system_event(
    'info',
    'calculate_readiness',
    'Readiness calculation completed',
    jsonb_build_object('score', v_readiness_score),
    'calculation_completed',
    v_request_id,
    p_user_id,
    null,
    extract(milliseconds from clock_timestamp() - v_started_at)::integer
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    PERFORM public.log_system_event(
      'error',
      'calculate_readiness',
      'Foreign-key violation in readiness calculation',
      jsonb_build_object('sqlstate', sqlstate, 'error', sqlerrm),
      'calculation_failed',
      v_request_id,
      p_user_id
    );
    RAISE;
  WHEN others THEN
    PERFORM public.log_system_event(
      'critical',
      'calculate_readiness',
      'Unexpected readiness calculation failure',
      jsonb_build_object('sqlstate', sqlstate, 'error', sqlerrm),
      'calculation_failed',
      v_request_id,
      p_user_id
    );
    RAISE;
END;
$$;
