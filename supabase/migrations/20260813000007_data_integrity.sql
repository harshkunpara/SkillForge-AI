-- Phase 1: Add check constraints to enforce data integrity

-- Enforce valid score on user_skills (0 to 100)
ALTER TABLE public.user_skills
  DROP CONSTRAINT IF EXISTS user_skills_score_valid;
ALTER TABLE public.user_skills
  ADD CONSTRAINT user_skills_score_valid
  CHECK (current_score IS NULL OR (current_score BETWEEN 0 AND 100));

-- Enforce valid score on skill_requirements (0 to 100)
ALTER TABLE public.skill_requirements
  DROP CONSTRAINT IF EXISTS skill_requirements_score_valid;
ALTER TABLE public.skill_requirements
  ADD CONSTRAINT skill_requirements_score_valid
  CHECK (required_score IS NULL OR (required_score BETWEEN 0 AND 100));

-- Enforce valid score on assessments (0 to 100)
ALTER TABLE public.assessments
  DROP CONSTRAINT IF EXISTS assessments_score_valid;
ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_score_valid
  CHECK (score IS NULL OR (score BETWEEN 0 AND 100));

-- Enforce valid score on interview_sessions (0 to 100)
ALTER TABLE public.interview_sessions
  DROP CONSTRAINT IF EXISTS interview_sessions_score_valid;
ALTER TABLE public.interview_sessions
  ADD CONSTRAINT interview_sessions_score_valid
  CHECK (overall_score IS NULL OR (overall_score BETWEEN 0 AND 100));
