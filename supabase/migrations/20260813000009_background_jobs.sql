-- Phase 2: Create background_jobs table and helper queue functions

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),

  attempts integer NOT NULL DEFAULT 0
    CHECK (attempts >= 0),

  max_attempts integer NOT NULL DEFAULT 3
    CHECK (max_attempts BETWEEN 1 AND 10),

  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  idempotency_key text UNIQUE
);

CREATE INDEX IF NOT EXISTS background_jobs_status_run_at_idx
  ON public.background_jobs (status, run_at);

CREATE INDEX IF NOT EXISTS background_jobs_user_id_idx
  ON public.background_jobs (user_id);

CREATE INDEX IF NOT EXISTS background_jobs_task_type_status_idx
  ON public.background_jobs (task_type, status);

CREATE INDEX IF NOT EXISTS background_jobs_ready_idx
  ON public.background_jobs (run_at, created_at)
  WHERE status = 'queued';

-- Transactionally enqueues a background job with optional idempotency
CREATE OR REPLACE FUNCTION public.enqueue_background_job(
  p_user_id uuid,
  p_task_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  if p_task_type not in ('resume_analysis', 'recalculate_skills', 'recalculate_readiness') then
    raise exception 'Unsupported task type: %', p_task_type;
  end if;

  INSERT INTO public.background_jobs (
    user_id,
    task_type,
    payload,
    idempotency_key
  )
  VALUES (
    p_user_id,
    p_task_type,
    coalesce(p_payload, '{}'::jsonb),
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key)
  DO UPDATE SET id = background_jobs.id
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

-- Transactionally claims the next available background job using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_next_background_job()
RETURNS SETOF public.background_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH next_job AS (
    SELECT id
    FROM public.background_jobs
    WHERE status = 'queued'
      AND run_at <= now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.background_jobs j
  SET
    status = 'processing',
    attempts = attempts + 1,
    locked_at = now(),
    updated_at = now()
  FROM next_job
  WHERE j.id = next_job.id
  RETURNING j.*;
END;
$$;

-- Recovery process for stale or hung jobs
CREATE OR REPLACE FUNCTION public.recover_stale_background_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recovered_count integer;
BEGIN
  WITH affected AS (
    UPDATE public.background_jobs
    SET
      status = CASE
        WHEN attempts >= max_attempts THEN 'failed'
        ELSE 'queued'
      END,
      run_at = CASE
        WHEN attempts >= max_attempts THEN run_at
        ELSE now()
      END,
      failed_at = CASE
        WHEN attempts >= max_attempts THEN now()
        ELSE null
      END,
      last_error = coalesce(last_error, 'Worker lease expired'),
      updated_at = now()
    WHERE status = 'processing'
      AND locked_at < now() - interval '10 minutes'
    RETURNING id
  )
  SELECT count(*) INTO v_recovered_count FROM affected;
  
  RETURN v_recovered_count;
END;
$$;
