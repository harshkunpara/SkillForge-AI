# SkillForge AI — Repository Audit
Repo audited: `github.com/harshkunpara/SkillForge-AI` (main, commit at time of audit)
Note: the URL you gave (`25it048/SkillForge-AI`) redirected to this repo — confirm this is the right one before trusting the rest of this report.

---

## 1. Frontend Routes (file paths)

| Path | Component | File | Guarded? |
|---|---|---|---|
| `/` | Landing | `src/pages/Landing.tsx` | public |
| `/login`, `/register` | Login | `src/pages/Login.tsx` | public |
| `/onboarding` | Onboarding | `src/pages/Onboarding.tsx` | public (⚠️ see §9) |
| `/dashboard` | Dashboard | `src/pages/Dashboard.tsx` | `ProtectedRoute` |
| `/resume` | ResumeAnalyzer | `src/pages/ResumeAnalyzer.tsx` | `ProtectedRoute` |
| `/skill-gap` | SkillGap | `src/pages/SkillGap.tsx` | `ProtectedRoute` |
| `/roadmap` | Roadmap | `src/pages/Roadmap.tsx` | `ProtectedRoute` |
| `/skills` | MySkills | `src/pages/MySkills.tsx` | `ProtectedRoute` |
| `/career` | CareerTarget | `src/pages/CareerTarget.tsx` | `ProtectedRoute` |
| `/projects` | Projects | `src/pages/Projects.tsx` | `ProtectedRoute` |
| `/interviews` | Interviews | `src/pages/Interviews.tsx` | `ProtectedRoute` |
| `/recommendations` | Recommendations | `src/pages/Recommendations.tsx` | `ProtectedRoute` |
| `/analytics` | Analytics | `src/pages/Analytics.tsx` | `ProtectedRoute` |
| `/github` | GitHubAnalyzer | `src/pages/GitHubAnalyzer.tsx` | `ProtectedRoute` |
| `/profile` | Profile | `src/pages/Profile.tsx` | `ProtectedRoute` |
| `/admin` | AdminDashboard | `src/pages/admin/AdminDashboard.tsx` | **NONE ⚠️** |
| `/admin/users` | AdminUsers | `src/pages/admin/AdminUsers.tsx` | **NONE ⚠️** |
| `/admin/skills` | AdminSkills | `src/pages/admin/AdminSkills.tsx` | **NONE ⚠️** |
| `/admin/courses` | AdminCourses | `src/pages/admin/AdminCourses.tsx` | **NONE ⚠️** |
| `/admin/settings` | AdminSettings | `src/pages/admin/AdminSettings.tsx` | **NONE ⚠️** |

Source: `src/routes.tsx`. `AdminLayout` (`src/layouts/AdminLayout.tsx`) is mounted directly with no `ProtectedRoute`/role check wrapper — **anyone with the URL can load the admin shell**. There's also no `role` column anywhere in the schema, so even if it were wrapped in `ProtectedRoute`, that only checks "logged in," not "is admin."

---

## 2. Supabase Tables, Columns, Types (as they exist today)

From `supabase/migrations/001_schema.sql` + `002_profile_extended.sql` + `src/lib/database.types.ts`:

**`public.profiles`** (extends `auth.users`, PK = `auth.users.id`)
`id uuid PK`, `full_name text`, `college text`, `degree text`, `year text`, `branch text`, `experience_level text default 'beginner'`, `target_career text`, `target_companies text[]`, `github_username text`, `resume_url text`, `resume_score int`, `placement_readiness int default 0`, `onboarding_complete bool default false`, `phone text`, `bio text`, `graduation_year text`, `weekly_hours int default 10`, `career_goal text`, `target_company text`, `avatar_url text`, `resume_data jsonb default '{}'`, `created_at`, `updated_at`.

**`public.user_skills`** — `id`, `user_id → profiles`, `skill_name`, `category`, `resume_level`, `verified_level`, `current_score int default 0`, `confidence int`, `evidence text`, `status text default 'unverified'`, `created_at`, `updated_at`. `UNIQUE(user_id, skill_name)`.

**`public.skill_gaps`** — `id`, `user_id`, `skill_name`, `current_score int default 0`, `required_score int default 80`, `gap int GENERATED (greatest(0, required-current))`, `priority text default 'medium'`, `reason`, `recommended_action`, timestamps. `UNIQUE(user_id, skill_name)`.

**`public.roadmaps`** — `id`, `user_id → profiles UNIQUE`, `target_career`, `current_readiness int default 0`, `ai_updated_at`, `ai_update_reason`, timestamps. *(Only ONE roadmap per user total today — not per role.)*

**`public.roadmap_phases`** — `id`, `roadmap_id → roadmaps`, `phase_number`, `title`, `duration`, `status text default 'pending'`, `progress int default 0`, `skills text[]`, `ai_added bool`, `ai_reason`, `created_at`.

**`public.roadmap_tasks`** — `id`, `phase_id → roadmap_phases` (not `roadmap_id`!), `name`, `type text default 'course'`, `done bool default false`, `created_at`.

**`public.resume_analyses`** — `id`, `user_id`, `resume_url`, `score int`, `skills_detected jsonb`, `sections jsonb`, `improvements jsonb`, `raw_text text`, `created_at`. *(No standalone `resumes` table — the file itself is just a Storage object referenced by URL.)*

**`public.assessments`** — `id`, `user_id`, `skill_name`, `questions jsonb`, `answers jsonb`, `score int`, `verified_level`, `created_at`.

**`public.interview_sessions`** — `id`, `user_id`, `mode text default 'mixed'`, `difficulty text default 'medium'`, `questions jsonb`, `answers jsonb`, `scores jsonb`, `overall_score int default 0`, `weak_areas text[]`, `feedback jsonb`, `created_at`. *(named `interview_sessions`, not `interviews`)*

**`public.readiness_history`** — `id`, `user_id`, `score`, `dsa_score`, `dev_score`, `cs_score`, `projects_score`, `interview_score`, `resume_score`, `recorded_at`.

**`public.activity_log`** — `id`, `user_id`, `type`, `description`, `metadata jsonb`, `created_at`.

Tables the spec asks for that **do not exist at all today**: `resumes`, `skill_requirements`, `readiness_scores` (current snapshot, separate from history), `recommendations` (⚠️ `generate-recommendations` Edge Function computes recs via AI but **never persists them** — see §9), `processing_jobs`, `evidence_records`, `data_conflicts`, `admin_audit_logs`. `interviews` exists conceptually as `interview_sessions`.

---

## 3. Existing Migrations

| File | Purpose |
|---|---|
| `supabase/migrations/001_schema.sql` | Initial schema: profiles, user_skills, skill_gaps, roadmaps, roadmap_phases, roadmap_tasks, resume_analyses, assessments, interview_sessions, readiness_history, activity_log + RLS + auth trigger + `resumes` storage bucket (private) |
| `supabase/migrations/002_profile_extended.sql` | Adds extended profile columns (phone, bio, graduation_year, etc.) + `avatars` storage bucket (public) |

No down/rollback sections exist in either file.

---

## 4. Edge Functions (Deno)

| Function | Purpose | JWT check |
|---|---|---|
| `supabase/functions/ai-assistant/index.ts` | Chat assistant, pulls profile/skills/gaps as context, calls Anthropic | ✅ `supabase.auth.getUser()` |
| `supabase/functions/analyze-resume/index.ts` | Parses resume text via Anthropic, returns skill extraction/score | ✅ |
| `supabase/functions/calculate-gaps/index.ts` | Computes skill gaps vs target career via Anthropic (haiku) | ✅ |
| `supabase/functions/evaluate-interview/index.ts` | Scores interview Q&A via Anthropic | ✅ |
| `supabase/functions/generate-questions/index.ts` | Generates interview questions from profile/gaps | ✅ |
| `supabase/functions/generate-recommendations/index.ts` | Generates learning recs via Anthropic — **result is returned to client but not written to any table** | ✅ |
| `supabase/functions/generate-roadmap/index.ts` | Builds a phased roadmap via Anthropic | ✅ |
| `supabase/functions/server/index.tsx` | Legacy Hono server, only a `/health` route + generic `kv_store.tsx` helper. Uses `cors({ origin: "*" })` — wide open, no JWT check present, appears unused/leftover scaffolding | ❌ no auth, open CORS |

All seven "real" functions correctly build a service-role client but authenticate the caller via `auth.getUser(bearer_token)` before doing any DB read — that pattern is correct and should be preserved.

---

## 5. RLS Policies (table → policy)

`profiles`: "Users can view own profile" (select), "insert own profile", "update own profile" — all `auth.uid() = id`.
`user_skills`: select/insert/update/delete own — `auth.uid() = user_id`.
`skill_gaps`: select/insert/update/delete own.
`roadmaps`: select/insert/update own (no delete policy).
`roadmap_phases`: select/insert/update/delete scoped via subquery on `roadmaps.user_id`.
`roadmap_tasks`: "view own roadmap tasks" (select) + "manage own roadmap tasks" (`for all`) via nested join through `roadmap_phases → roadmaps`.
`resume_analyses`: select/insert own (no update/delete).
`assessments`: select/insert own.
`interview_sessions`: select/insert own.
`readiness_history`: select/insert own.
`activity_log`: select/insert own.
`storage.objects` (`resumes` bucket): insert/select scoped to `auth.uid()::text = (storage.foldername(name))[1]`.
`storage.objects` (`avatars` bucket): insert/update scoped to owner; **select is public** (`bucket_id = 'avatars'`, no owner check — intentional, avatars are meant to be publicly viewable).

Gaps: **no `admin_*` policies anywhere** — there is no admin role concept in the DB at all, so nothing currently allows an "admin" to read across users, and nothing currently *blocks* it either because no admin surface hits the DB with elevated privilege from the client.

---

## 6. Storage Buckets

| Bucket | Public? | Policies |
|---|---|---|
| `resumes` | **false** (private) | insert/select scoped to `(storage.foldername(name))[1] = auth.uid()` |
| `avatars` | **true** (public) | insert/update scoped to owner folder; select open to anyone |

---

## 7. Mock Data Locations (file path : line)

| File | Lines | What |
|---|---|---|
| `src/components/AIAssistant.tsx` | 20–33 | `AI_RESPONSES` map + `DEFAULT_RESPONSE` — hardcoded canned chat replies used as a **silent fallback** when `callEdgeFunction("ai-assistant", …)` throws (line ~62, `catch` block). This means if the Edge Function is down or misconfigured, the UI silently shows fabricated numbers as if they were the user's real data. |
| `src/pages/admin/AdminDashboard.tsx` | 4–47 | `USER_GROWTH`, `DAU`, `CAREERS`, `SKILL_GAPS`, `KPI`, `AI_PERF`, `RECENT_ACTIVITY` — **the entire admin dashboard is static fabricated arrays**, no Supabase query anywhere in the file, yet the page copy says "Real-time analytics and platform health metrics." |
| `src/pages/Landing.tsx` | 21–24, 100–130 | `TESTIMONIALS` (fake names/colleges/scores) and a decorative fake "mini dashboard" mockup (78% ring, static skill-gap bars). Lower severity — this is marketing-page decoration, not something presented as the logged-in user's real data, but the numbers are the same "78%" pattern reused elsewhere so it can look real. |
| `src/pages/Login.tsx` | 70–73 | Decorative sidebar stats (`Placement Readiness 78%`, `Skills Mastered 24/35`, `Interview Score 76%`) — same concern as Landing, pre-login marketing panel, not tied to a real user. |

`src/pages/Analytics.tsx` was flagged by the percent-grep but is a **false positive** — `112:5%` / `113:95%` there are `domain={[0, 100]}`-style chart padding values, not fabricated metrics; the file correctly reads from Supabase via `useSupabaseData.ts`.

---

## 8. Every Hardcoded Percentage (value : file path)

| Value | File |
|---|---|
| 25%, 61%, 65%, 78%, 84%, 91% | `src/components/AIAssistant.tsx:21,23,25` |
| 78% | `src/components/AIAssistant.tsx:33` |
| 78%, 8% | `src/pages/Landing.tsx:118,122` |
| 94%, 61%, 84%, 89%, 91% | `src/pages/Landing.tsx:22-24` |
| 78%, 76% | `src/pages/Login.tsx:71,73` |
| 18%,12%,24%,31%,19%,27%,82%,68%,85%,72% | `src/pages/admin/AdminDashboard.tsx:28-47` (KPI trend %, AI_PERF %) |
| 32% | `src/pages/admin/AdminDashboard.tsx:173` |

(`5%`/`95%` hits in `Analytics.tsx:112-113` and `AdminDashboard.tsx:82-83` are chart-axis `domain` bounds, not data — excluded above.)

---

## 9. Missing Tables vs. Requirements

Given the intended data model (resume → skills → gaps → readiness → roadmap → recommendations → interviews → admin oversight), these are absent or structurally insufficient today:

- **`resumes`** — no table for the uploaded file/parse record independent of `resume_analyses`; right now a resume is just a Storage path glued onto `profiles.resume_url`, with no versioning.
- **`skill_requirements`** — no canonical "what score does role X need in skill Y" table. `calculate-gaps` re-derives this from the LLM on every call instead of reading a stable reference table, meaning gap scoring isn't reproducible or auditable.
- **`readiness_scores`** — no "current snapshot" table distinct from `readiness_history`; `profiles.placement_readiness` is the only current value and it's just an int column with no breakdown or timestamp of last computation.
- **`recommendations`** — **critical gap**: `generate-recommendations` Edge Function produces AI output but the function never writes it anywhere, so recommendations aren't persisted, can't be marked accepted/dismissed, and disappear on refresh.
- **`interviews`** — effectively covered by `interview_sessions`, but naming/shape should be reconciled (below I create `interviews` alongside, additive).
- **`processing_jobs`** — no async job tracking; resume parsing / roadmap generation are all synchronous request/response with no retry, status, or failure record.
- **`evidence_records`** — no table linking a skill/score claim back to its source artifact (resume text span, GitHub repo, assessment id) — currently `user_skills.evidence` is a single free-text column with no structured provenance.
- **`data_conflicts`** — no mechanism to record when two signals disagree (e.g., resume claims "Expert Python" but assessment scores 40%) — currently silently overwritten.
- **`admin_audit_logs`** — no audit trail at all, and no admin role, which compounds the §1 finding that `/admin/*` is unauthenticated.
- **No `role` column anywhere** — `admin_audit_logs` RLS "admin only" is unenforceable without one. This is added in the migration below.

---

## 10. Dependency Diagram

```
 resumes ──▶ resume_analyses ──▶ user_skills ──┬──▶ skill_gaps ──▶ readiness_scores ──▶ readiness_history
                                                │         │                │
                     skill_requirements ────────┘         ▼                ▼
                                                     recommendations   roadmaps ──▶ roadmap_tasks
                                                                                        │
                              assessments ──▶ user_skills (score updates)               ▼
                              interviews  ──▶ readiness_scores                    processing_jobs
                                                                                   (async generation)

 evidence_records  ── links back to: resume_analyses | assessments | interviews | github data
 data_conflicts    ── raised when: resume-claimed skill vs verified (assessment/interview) skill disagree
 admin_audit_logs  ── records: any admin_* write against another user's row (requires role='admin')
```

Read: a resume is parsed → produces/updates skills → skills are compared against `skill_requirements` for the target role → produces gaps → gaps + assessments/interviews roll up into a readiness score (snapshot + history) → readiness + gaps drive both the roadmap and standalone recommendations → conflicting signals between resume claims and verified evidence raise `data_conflicts` → all of it is provenance-linked via `evidence_records`.
