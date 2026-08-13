-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  college text,
  degree text,
  year text,
  branch text,
  experience_level text default 'beginner',
  target_career text,
  target_companies text[] default '{}',
  github_username text,
  resume_url text,
  resume_score int,
  placement_readiness int default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User Skills
create table public.user_skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  skill_name text not null,
  category text not null,
  resume_level text,
  verified_level text,
  current_score int default 0,
  confidence int,
  evidence text,
  status text default 'unverified',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, skill_name)
);

-- Skill Gaps
create table public.skill_gaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  skill_name text not null,
  current_score int default 0,
  required_score int default 80,
  gap int generated always as (greatest(0, required_score - current_score)) stored,
  priority text default 'medium',
  reason text,
  recommended_action text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, skill_name)
);

-- Roadmaps
create table public.roadmaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  target_career text,
  current_readiness int default 0,
  ai_updated_at timestamptz,
  ai_update_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Roadmap Phases
create table public.roadmap_phases (
  id uuid primary key default uuid_generate_v4(),
  roadmap_id uuid references public.roadmaps(id) on delete cascade,
  phase_number int not null,
  title text not null,
  duration text,
  status text default 'pending',
  progress int default 0,
  skills text[] default '{}',
  ai_added boolean default false,
  ai_reason text,
  created_at timestamptz default now()
);

-- Roadmap Tasks
create table public.roadmap_tasks (
  id uuid primary key default uuid_generate_v4(),
  phase_id uuid references public.roadmap_phases(id) on delete cascade,
  name text not null,
  type text default 'course',
  done boolean default false,
  created_at timestamptz default now()
);

-- Resume Analyses
create table public.resume_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  resume_url text,
  score int,
  skills_detected jsonb default '[]',
  sections jsonb default '{}',
  improvements jsonb default '[]',
  raw_text text,
  created_at timestamptz default now()
);

-- Assessments
create table public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  skill_name text not null,
  questions jsonb default '[]',
  answers jsonb default '[]',
  score int,
  verified_level text,
  created_at timestamptz default now()
);

-- Interview Sessions
create table public.interview_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  mode text default 'mixed',
  difficulty text default 'medium',
  questions jsonb default '[]',
  answers jsonb default '[]',
  scores jsonb default '[]',
  overall_score int default 0,
  weak_areas text[] default '{}',
  feedback jsonb default '{}',
  created_at timestamptz default now()
);

-- Readiness History
create table public.readiness_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  score int,
  dsa_score int,
  dev_score int,
  cs_score int,
  projects_score int,
  interview_score int,
  resume_score int,
  recorded_at timestamptz default now()
);

-- Activity Log
create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- =====================
-- Row Level Security
-- =====================

alter table public.profiles enable row level security;
alter table public.user_skills enable row level security;
alter table public.skill_gaps enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_phases enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.assessments enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.readiness_history enable row level security;
alter table public.activity_log enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- User Skills policies
create policy "Users can view own skills" on public.user_skills for select using (auth.uid() = user_id);
create policy "Users can insert own skills" on public.user_skills for insert with check (auth.uid() = user_id);
create policy "Users can update own skills" on public.user_skills for update using (auth.uid() = user_id);
create policy "Users can delete own skills" on public.user_skills for delete using (auth.uid() = user_id);

-- Skill Gaps policies
create policy "Users can view own skill gaps" on public.skill_gaps for select using (auth.uid() = user_id);
create policy "Users can insert own skill gaps" on public.skill_gaps for insert with check (auth.uid() = user_id);
create policy "Users can update own skill gaps" on public.skill_gaps for update using (auth.uid() = user_id);
create policy "Users can delete own skill gaps" on public.skill_gaps for delete using (auth.uid() = user_id);

-- Roadmaps policies
create policy "Users can view own roadmap" on public.roadmaps for select using (auth.uid() = user_id);
create policy "Users can insert own roadmap" on public.roadmaps for insert with check (auth.uid() = user_id);
create policy "Users can update own roadmap" on public.roadmaps for update using (auth.uid() = user_id);

-- Roadmap Phases (access via roadmap ownership)
create policy "Users can view own roadmap phases" on public.roadmap_phases for select
  using (roadmap_id in (select id from public.roadmaps where user_id = auth.uid()));
create policy "Users can insert own roadmap phases" on public.roadmap_phases for insert
  with check (roadmap_id in (select id from public.roadmaps where user_id = auth.uid()));
create policy "Users can update own roadmap phases" on public.roadmap_phases for update
  using (roadmap_id in (select id from public.roadmaps where user_id = auth.uid()));
create policy "Users can delete own roadmap phases" on public.roadmap_phases for delete
  using (roadmap_id in (select id from public.roadmaps where user_id = auth.uid()));

-- Roadmap Tasks
create policy "Users can view own roadmap tasks" on public.roadmap_tasks for select
  using (phase_id in (
    select rp.id from public.roadmap_phases rp
    join public.roadmaps r on r.id = rp.roadmap_id
    where r.user_id = auth.uid()
  ));
create policy "Users can manage own roadmap tasks" on public.roadmap_tasks for all
  using (phase_id in (
    select rp.id from public.roadmap_phases rp
    join public.roadmaps r on r.id = rp.roadmap_id
    where r.user_id = auth.uid()
  ));

-- Resume Analyses policies
create policy "Users can view own analyses" on public.resume_analyses for select using (auth.uid() = user_id);
create policy "Users can insert own analyses" on public.resume_analyses for insert with check (auth.uid() = user_id);

-- Assessments policies
create policy "Users can view own assessments" on public.assessments for select using (auth.uid() = user_id);
create policy "Users can insert own assessments" on public.assessments for insert with check (auth.uid() = user_id);

-- Interview sessions policies
create policy "Users can view own interviews" on public.interview_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own interviews" on public.interview_sessions for insert with check (auth.uid() = user_id);

-- Readiness history policies
create policy "Users can view own history" on public.readiness_history for select using (auth.uid() = user_id);
create policy "Users can insert own history" on public.readiness_history for insert with check (auth.uid() = user_id);

-- Activity log policies
create policy "Users can view own activity" on public.activity_log for select using (auth.uid() = user_id);
create policy "Users can insert own activity" on public.activity_log for insert with check (auth.uid() = user_id);

-- =====================
-- Triggers
-- =====================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at on profiles
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger user_skills_updated_at before update on public.user_skills
  for each row execute function public.update_updated_at();
create trigger skill_gaps_updated_at before update on public.skill_gaps
  for each row execute function public.update_updated_at();
create trigger roadmaps_updated_at before update on public.roadmaps
  for each row execute function public.update_updated_at();

-- Storage bucket for resumes
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false) on conflict do nothing;

create policy "Users can upload own resume" on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can view own resume" on storage.objects for select
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
