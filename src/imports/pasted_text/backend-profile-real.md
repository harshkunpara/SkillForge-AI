[Certain] Haan—**abhi tumhe full backend + Profile ko real banana hai**, baaki UI ko redesign/add nahi karna. Iske liye Figma Make ko focused prompt do:

```text
SKILLFORGE AI — COMPLETE REAL BACKEND + STUDENT PROFILE

Supabase is already connected and authentication/database are working.

Now finish the COMPLETE BACKEND and make the EXISTING STUDENT PROFILE fully real.

DO NOT redesign the frontend.
DO NOT remove existing pages.
DO NOT create mock/demo data.
DO NOT hardcode values.

================================================
1. COMPLETE BACKEND
================================================

Connect every existing frontend feature to real Supabase data.

Use the authenticated user's:

auth.uid()

as the source for all personal data.

Implement and verify:

- Authentication
- Profiles
- Resume Storage
- Resume Analysis
- User Skills
- Skill Gaps
- Career Readiness
- Roadmaps
- Roadmap Phases
- Roadmap Tasks
- Progress
- Assessments
- Interview Sessions
- Readiness History
- Activity Logs
- Recommendations
- AI Assistant
- GitHub data if configured

Use Supabase PostgreSQL + RLS + Storage + Edge Functions.

Never expose service-role keys or AI API keys in the browser.

================================================
2. REAL RESUME PIPELINE
================================================

When the student uploads a REAL resume:

PDF
↓
Supabase Storage
↓
Extract actual text
↓
AI Edge Function
↓
Structured analysis
↓
Database
↓
Profile
↓
Skills
↓
Skill Gaps
↓
Readiness
↓
Roadmap
↓
Recommendations

Extract real information:

- Name
- Email
- Phone if available
- University
- Degree
- Branch
- Graduation year
- Education
- Experience
- Skills
- Programming languages
- Frameworks
- Tools
- Projects
- Certifications
- Achievements
- Soft skills

NEVER invent information that does not exist in the resume.

================================================
3. STUDENT PROFILE — FULL REAL DATA
================================================

Make the EXISTING Profile page completely dynamic.

Display the authenticated student's real:

PERSONAL
- Profile photo
- Full name
- Email
- Phone if available
- Bio

EDUCATION
- University
- Degree
- Branch
- Current year
- Graduation year

CAREER
- Target role
- Target company
- Career goal
- Weekly learning hours

RESUME
- Resume filename
- Upload date
- Resume score
- Resume strengths
- Resume weaknesses
- Improvement suggestions

EDUCATION FROM RESUME
- University
- Degree
- Branch
- Education details

EXPERIENCE
- Company
- Role
- Duration
- Description

PROJECTS
- Project name
- Description
- Technologies
- Role
- Skills demonstrated

CERTIFICATIONS
- Certification name
- Provider
- Date if available
- Skills

ACHIEVEMENTS
- Real achievements extracted from resume

SKILLS
For every real user skill show:

- Skill name
- Category
- Proficiency
- Confidence
- Evidence
- Source
- Verification status

================================================
4. USER PROJECTS VS RECOMMENDED PROJECTS
================================================

IMPORTANT:

Separate:

"MY PROJECTS"

from:

"AI RECOMMENDED PROJECTS"

Resume projects must appear under MY PROJECTS.

AI-generated recommendations must appear under RECOMMENDED PROJECTS.

Never mix them.

================================================
5. USER CERTIFICATIONS VS RECOMMENDATIONS
================================================

Separate:

"MY CERTIFICATIONS"

from:

"RECOMMENDED CERTIFICATIONS"

Only show certifications actually present in the user's profile/resume under MY CERTIFICATIONS.

================================================
6. PROFILE EDITING
================================================

Existing profile edit functionality must update the real:

profiles

table.

When user changes:

- Name
- University
- Degree
- Branch
- Year
- Graduation year
- Target role
- Target company
- Career goal
- Weekly hours
- Bio

save to Supabase.

After saving:

Supabase
↓
Profile
↓
Dashboard
↓
Career Target
↓
Skill Gaps
↓
Readiness
↓
Roadmap

must stay synchronized.

================================================
7. AVATAR
================================================

Profile photo upload must use Supabase Storage.

Save the resulting URL to profiles.

Refresh page and verify the avatar remains.

================================================
8. CAREER TARGET
================================================

Target role must be stored in the user's profile.

When target role changes:

recalculate:

- Required skills
- Skill gaps
- Readiness
- Roadmap
- Recommendations

Do not leave old career data active.

================================================
9. REAL SKILLS
================================================

Skills must come from:

- Resume analysis
- Assessment
- Project evidence
- User input

Save to:

user_skills

Do not use static skills.

If resume says:

C++
Java
React

show those.

If another student has:

Python
Django
SQL

show those instead.

================================================
10. REAL SKILL GAPS
================================================

Compare:

Student's actual skills
VS
Target career requirements.

Generate:

- Current level
- Required level
- Gap
- Priority
- Reason
- Recommended action

Store in:

skill_gaps

================================================
11. REAL READINESS
================================================

Calculate readiness from actual data.

Do NOT use fixed values like:

78%
30%
72%

unless they actually exist in that user's database.

Use real:

- Resume
- Skills
- Projects
- CS fundamentals
- Interview
- Assessment
- Career target

All UI components must use the SAME readiness source.

No mismatch between sidebar and dashboard.

================================================
12. REAL ROADMAP
================================================

Generate personalized roadmap using:

- Profile
- Resume
- Skills
- Skill gaps
- Target role
- Weekly hours
- Existing projects
- Progress
- Assessment results

Save:

roadmaps
roadmap_phases
roadmap_tasks

Tasks must persist.

================================================
13. REAL PROGRESS
================================================

When student completes a task:

update database.

Then update:

- Roadmap progress
- Dashboard
- Activity log
- Readiness if applicable

Refresh page and verify it remains completed.

================================================
14. REAL ASSESSMENT
================================================

When student completes an assessment:

answers
↓
real score
↓
update user_skills
↓
recalculate skill gaps
↓
recalculate readiness
↓
update roadmap

Persist every change.

================================================
15. ADAPTIVE ROADMAP
================================================

This must actually work.

Example:

Graph Algorithms:
35%

After assessment:
82%

Then automatically:

- update skill
- update skill gap
- update readiness
- modify roadmap
- save changes
- show AI update notification

Do not fake the update visually.

================================================
16. REAL AI ASSISTANT
================================================

AI Assistant must receive the current student's real:

- Profile
- Resume
- Skills
- Skill Gaps
- Roadmap
- Progress
- Assessments
- Interview results

Answer based on the student's actual data.

================================================
17. REAL ANALYTICS
================================================

Use real:

readiness_history
activity_log
progress
assessments
interview_sessions

Never generate fake chart data.

If there is insufficient history, show an empty state.

================================================
18. SECURITY
================================================

Use Supabase RLS.

A student can only access their own:

- Profile
- Resume
- Skills
- Skill Gaps
- Roadmap
- Progress
- Assessments
- Interviews
- Analytics

Never expose another student's data.

================================================
19. NO MOCK DATA
================================================

Search the ENTIRE CODEBASE and remove production mock data:

- Hardcoded percentages
- Fake user names
- Static skills
- Static skill gaps
- Static roadmap
- Static tasks
- Static recommendations
- Fake interview results
- Fake analytics

Use real Supabase data everywhere.

If data is missing, show an empty state instead.

================================================
20. FINAL TEST
================================================

Create a completely new account.

Complete profile.

Upload a REAL resume.

Verify:

Resume
↓
Profile populated
↓
Skills populated
↓
Projects populated
↓
Certifications populated
↓
Skill gaps generated
↓
Readiness calculated
↓
Roadmap generated
↓
Recommendations generated

Then edit profile.

Refresh.

Logout.

Login again.

Verify everything remains.

Then create a SECOND account with a DIFFERENT resume.

Verify the second student receives different:

- Profile
- Skills
- Skill gaps
- Readiness
- Roadmap
- Recommendations

If both students receive the same data, the backend is NOT complete.

DO NOT STOP AT "BUILD PASSES".

Run the application and test the actual data flow.

Fix all TypeScript, Supabase, API, Edge Function, RLS, runtime and data synchronization errors.

The final result must be a genuinely functional backend with a completely real, personalized Student Profile.
```
