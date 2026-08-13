-- Phase 1: Create system_logs table and safe logging function

CREATE TABLE IF NOT EXISTS public.system_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  source text NOT NULL,
  event_name text,
  message text NOT NULL,
  request_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id uuid,
  duration_ms integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS system_logs_created_at_idx
  ON public.system_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS system_logs_severity_created_at_idx
  ON public.system_logs (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS system_logs_source_created_at_idx
  ON public.system_logs (source, created_at DESC);

CREATE INDEX IF NOT EXISTS system_logs_request_id_idx
  ON public.system_logs (request_id);

CREATE OR REPLACE FUNCTION public.log_system_event(
  p_severity text,
  p_source text,
  p_message text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_event_name text DEFAULT null,
  p_request_id text DEFAULT null,
  p_user_id uuid DEFAULT null,
  p_job_id uuid DEFAULT null,
  p_duration_ms integer DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_logs (
    severity,
    source,
    event_name,
    message,
    request_id,
    user_id,
    job_id,
    duration_ms,
    details
  )
  VALUES (
    p_severity,
    p_source,
    p_event_name,
    left(p_message, 2000),
    p_request_id,
    p_user_id,
    p_job_id,
    p_duration_ms,
    coalesce(p_details, '{}'::jsonb)
  );

EXCEPTION WHEN OTHERS THEN
  -- Logging must never break the primary operation.
  RAISE WARNING 'system log failure: %', sqlerrm;
END;
$$;
