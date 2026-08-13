-- Phase 4: Create get_average_readiness function for admin panel

CREATE OR REPLACE FUNCTION public.get_average_readiness()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg integer;
BEGIN
  SELECT round(coalesce(avg(placement_readiness), 0))::integer INTO v_avg
  FROM public.profiles;
  
  RETURN v_avg;
END;
$$;
