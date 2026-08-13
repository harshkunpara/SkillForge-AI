-- Phase 1: Add performance indexes to speed up core queries

CREATE INDEX IF NOT EXISTS user_skills_user_id_idx
  ON public.user_skills (user_id);

CREATE INDEX IF NOT EXISTS assessments_user_id_idx
  ON public.assessments (user_id);

CREATE INDEX IF NOT EXISTS skill_gaps_user_id_status_idx
  ON public.skill_gaps (user_id, status);

CREATE INDEX IF NOT EXISTS readiness_history_user_id_recorded_at_idx
  ON public.readiness_history (user_id, recorded_at DESC);
