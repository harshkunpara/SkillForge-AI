-- Phase 4: Admin Panel, Audit Logs, and Security Hardening

-- 1. Create admin audit logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text
);

-- 2. Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'student'
  CHECK (role IN ('student', 'admin'));

-- 3. Create helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN (v_role = 'admin');
END;
$$;

-- 4. Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Admin-only select policy for audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.is_admin());

-- Users cannot insert directly
DROP POLICY IF EXISTS "Deny direct user inserts on audit logs" ON public.admin_audit_logs;
CREATE POLICY "Deny direct user inserts on audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (false);
