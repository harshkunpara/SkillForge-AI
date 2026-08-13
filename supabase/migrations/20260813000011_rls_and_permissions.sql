-- Phase 3: Configure Row Level Security (RLS) policies for operational tables

-- 1. Enable RLS on operational tables
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- 2. System logs access rules
-- Users must NOT be able to read system logs.
DROP POLICY IF EXISTS "Deny all user reads on system logs" ON public.system_logs;
CREATE POLICY "Deny all user reads on system logs"
  ON public.system_logs
  FOR SELECT
  USING (false); -- Bypassed by postgres/service_role only

-- 3. Background jobs access rules
-- Users can view only their own background jobs
DROP POLICY IF EXISTS "Users can read own background jobs" ON public.background_jobs;
CREATE POLICY "Users can read own background jobs"
  ON public.background_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot insert or update background jobs directly.
DROP POLICY IF EXISTS "Deny direct user inserts on background jobs" ON public.background_jobs;
CREATE POLICY "Deny direct user inserts on background jobs"
  ON public.background_jobs
  FOR INSERT
  WITH CHECK (false); -- Bypassed by security definer functions (like enqueue_background_job)

DROP POLICY IF EXISTS "Deny direct user updates on background jobs" ON public.background_jobs;
CREATE POLICY "Deny direct user updates on background jobs"
  ON public.background_jobs
  FOR UPDATE
  USING (false); -- Bypassed by security definer claim/update functions only
