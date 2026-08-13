-- Up migration

create or replace function public.recalculate_skill_gaps(
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_career text;
  r record;
  v_current_score int;
  v_status text;
  v_priority text;
begin
  select target_career into v_target_career
  from public.profiles
  where id = p_user_id;

  if v_target_career is null then
    return;
  end if;

  for r in
    select skill_name, required_level, category
    from public.skill_requirements
    where career_role = v_target_career
  loop
    select current_score into v_current_score
    from public.user_skills
    where user_id = p_user_id and skill_name = r.skill_name
    limit 1;

    if v_current_score is null then
      v_status := 'assessment_required';
      v_priority := case when r.required_level >= 70 then 'critical' else 'high' end;
      v_current_score := 0; -- skill_gaps.gap is a generated column requiring a numeric current_score
    else
      if greatest(0, r.required_level - v_current_score) = 0 then
        v_status := 'closed';
        v_priority := 'low';
      else
        v_status := 'open';
        v_priority := case
          when (r.required_level - v_current_score) >= 40 then 'critical'
          when (r.required_level - v_current_score) >= 20 then 'high'
          when (r.required_level - v_current_score) >= 10 then 'medium'
          else 'low'
        end;
      end if;
    end if;

    insert into public.skill_gaps (
      user_id, skill_name, current_score, required_score,
      status, priority, updated_at
    )
    values (
      p_user_id, r.skill_name, v_current_score, r.required_level,
      v_status, v_priority, now()
    )
    on conflict (user_id, skill_name)
    do update set
      current_score = excluded.current_score,
      required_score = excluded.required_score,
      status = excluded.status,
      priority = excluded.priority,
      updated_at = now();
  end loop;

  -- Skills that were required before but are no longer part of this career's
  -- requirements would otherwise stay in skill_gaps indefinitely. Clean those up.
  delete from public.skill_gaps
  where user_id = p_user_id
    and skill_name not in (
      select skill_name from public.skill_requirements where career_role = v_target_career
    );
end;
$$;

-- Down migration
-- drop function if exists public.recalculate_skill_gaps(uuid);
