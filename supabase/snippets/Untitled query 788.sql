 select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('user_skills', 'skill_gaps', 'assessments', 'profiles', 'roadmaps', 'roadmap_tasks', 'roadmap_phases')
order by table_name, ordinal_position;