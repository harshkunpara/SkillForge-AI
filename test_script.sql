-- Test Script
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_res int;
  v_gap int;
  v_readiness int;
BEGIN
  -- Insert dummy auth user
  INSERT INTO auth.users (id, instance_id, aud, role, email) 
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test@test.com')
  ON CONFLICT (id) DO NOTHING;

  -- Insert dummy profile (handled by trigger or manually if needed)
  UPDATE public.profiles SET target_career = 'Software Engineer' WHERE id = v_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, target_career, full_name) VALUES (v_user_id, 'Software Engineer', 'Test User');
  END IF;

  -- Test gaps function executes without error
  PERFORM public.recalculate_skill_gaps(v_user_id);
  RAISE NOTICE 'recalculate_skill_gaps executed successfully';

  -- Test gap calculation: required > current
  INSERT INTO public.skill_requirements (career_role, skill_name, category, required_score) 
  VALUES ('Software Engineer', 'React', 'Frontend', 80)
  ON CONFLICT (career_role, skill_name) DO NOTHING;

  INSERT INTO public.user_skills (user_id, skill_name, category, current_score) 
  VALUES (v_user_id, 'React', 'Frontend', 90)
  ON CONFLICT (user_id, skill_name) DO UPDATE SET current_score = 90;

  PERFORM public.recalculate_skill_gaps(v_user_id);
  
  SELECT gap INTO v_gap FROM public.skill_gaps WHERE user_id = v_user_id AND skill_name = 'React';
  RAISE NOTICE 'Gap for React (current 90, required 80): %', v_gap;

  -- Test readiness shows NULL when assessments missing
  SELECT public.compute_readiness(v_user_id) INTO v_readiness;
  RAISE NOTICE 'Readiness without assessments: %', COALESCE(v_readiness::text, 'NULL');

  -- Test readiness shows real number when all assessed
  INSERT INTO public.assessments (user_id, skill_name, score) VALUES (v_user_id, 'DSA', 85);
  SELECT public.compute_readiness(v_user_id) INTO v_readiness;
  RAISE NOTICE 'Readiness with assessments: %', v_readiness;

END $$;
