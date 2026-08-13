The authentication and Supabase database are already connected and working.

Now make the ENTIRE EXISTING SkillForge AI application fully functional with REAL DATA.

**DO NOT redesign the UI. DO NOT create new pages. DO NOT remove existing features.**

The current UI contains many static/mock values such as 78% readiness, fixed skills, fixed tasks, fixed recommendations, etc. Replace ALL mock/static/demo data with real user-specific data from Supabase and real AI/backend logic.

## REQUIRED REAL FLOW

User Registration
→ Profile/Onboarding
→ Resume Upload
→ Real Resume Storage
→ Real AI Resume Analysis
→ Real Skill Extraction
→ Real Skill Scores
→ Real Skill Gap Calculation
→ Real Career Readiness Score
→ Real Personalized Roadmap
→ Real Roadmap Tasks
→ Real Course/Project/Certification Recommendations
→ Real Progress Tracking
→ Real Skill Assessment
→ Real Skill Verification
→ Adaptive Roadmap Update
→ Real AI Interview
→ Real Interview Evaluation
→ Real Analytics
→ Real AI Assistant

## 1. DASHBOARD

Remove all hardcoded values.

Dashboard must read from Supabase:

* placement readiness
* DSA score
* development score
* CS fundamentals score
* projects score
* interview score
* resume score
* today's tasks
* task completion
* skill gaps
* recommendations
* recent activity

If a new user has no data, show a proper empty state instead of fake numbers.

## 2. RESUME ANALYZER

Make upload real using Supabase Storage.

After upload:

Resume
→ extract text
→ secure AI analysis
→ structured JSON
→ save resume analysis
→ update user_skills
→ update resume score
→ update profile
→ calculate skill gaps
→ calculate readiness

Extract:

* skills
* proficiency
* confidence
* evidence
* projects
* education
* certifications
* experience
* resume improvements

Do not generate fake resume results.

## 3. SKILL GAP

Calculate skill gaps from:

student's actual skills
+
target career
+
required skills

Store results in `skill_gaps`.

Each gap must contain:

* current score
* required score
* gap
* priority
* reason
* recommended action

No hardcoded SQL/DSA/Java scores.

## 4. CAREER READINESS

Calculate the readiness score from real data.

Use actual:

* resume quality
* DSA skills
* development skills
* CS fundamentals
* projects
* interview performance

Store/read the score from Supabase.

Do not show 78% or any fixed score unless the database actually contains that score.

## 5. ROADMAP

Generate a personalized roadmap using:

* resume
* current skills
* skill gaps
* target career
* weekly available hours
* completed tasks
* assessment results

Save:

roadmap
→ phases
→ tasks

Every task must persist in Supabase.

When the user marks a task complete:

* save completion
* update progress
* update activity
* update readiness where appropriate

## 6. RECOMMENDATIONS

Make Recommendations real and personalized.

Use:

student profile
+
skill gaps
+
target role
+
current level
+
progress

Generate/retrieve:

* courses
* projects
* certifications
* resources

Every recommendation must have:

* title
* description
* match score
* reason
* relevant skills
* difficulty
* estimated time
* real URL when available

Never invent fake URLs.

## 7. PROJECTS

Projects must be personalized based on the student's skill gaps.

For every project show:

* required skills
* skills student will gain
* difficulty
* estimated time
* portfolio value
* why it was recommended

If the existing UI has project details/plans, make those dynamic.

## 8. MY SKILLS

Show skills from `user_skills`.

Allow the student to take the existing assessment.

After assessment:

assessment
→ score
→ update verified skill level
→ update user_skills
→ recalculate skill gaps
→ recalculate readiness
→ update roadmap

Do not only change the UI score. Persist everything in Supabase.

## 9. ADAPTIVE ROADMAP

This is a CORE FEATURE.

Example:

Before assessment:

Graph Algorithms = 35%

After assessment:

Graph Algorithms = 82%

Then:

* update user_skills
* recalculate skill_gaps
* recalculate readiness
* modify affected roadmap phases/tasks
* save the new roadmap
* record why the AI changed it

Show the existing "AI added phase" UI only when an actual AI-generated change occurred.

## 10. AI INTERVIEW COACH

Make the existing interview system real.

Generate questions using:

* target career
* resume
* current skills
* projects
* skill gaps

Save interview sessions.

Evaluate answers using secure server-side AI.

Store:

* overall score
* technical score
* communication score
* problem-solving score
* weak areas
* feedback

Update interview readiness using actual results.

## 11. ANALYTICS

All charts must use real database history.

Use:

`readiness_history`

and `activity_log`.

Show real:

* readiness trend
* skill improvement
* roadmap progress
* interview performance
* completed tasks
* learning activity

If insufficient historical data exists, show an empty/limited-data state instead of fake chart points.

## 12. GITHUB ANALYZER

If GitHub integration exists:

username
→ GitHub API
→ repositories
→ languages
→ contribution/project evidence
→ AI portfolio analysis
→ save relevant results

Do not show fake GitHub statistics.

If GitHub API is not configured, clearly show "Connect GitHub" instead of fake data.

## 13. AI ASSISTANT

The AI Assistant must use the logged-in user's actual:

* profile
* skills
* skill gaps
* roadmap
* progress
* assessments
* interview results

The assistant should give personalized answers.

Example:

User:
"What should I learn next?"

The answer must be based on the user's actual highest-priority skill gap.

Do not use generic hardcoded responses.

## 14. CAREER TARGET / JD ANALYZER

Career target must be stored in the user's profile.

If JD Analyzer exists:

Job Description
→ AI extraction
→ required skills
→ compare against student skills
→ skill gaps
→ recommendations

Persist useful results.

## 15. ADMIN

Keep the existing admin UI.

Admin data should come from Supabase.

Do not fake:

* user counts
* growth charts
* skill rankings
* recommendations
* career distribution

Protect admin functionality so normal students cannot access it.

## 16. DATABASE / SECURITY

Use the existing Supabase tables.

Ensure:

* RLS is enabled
* users can only access their own private data
* authenticated users cannot access another user's resume/profile/progress
* AI secrets remain server-side
* no service-role key is exposed to frontend
* validate all inputs

## 17. API / EDGE FUNCTIONS

Use secure Supabase Edge Functions for AI operations.

Existing functions:

* analyze-resume
* generate-roadmap
* evaluate-interview
* ai-assistant

Fix and complete them if necessary.

Create additional server-side functions only when required.

Do not duplicate existing functionality.

## 18. NO MOCK DATA

Search the entire codebase for:

* hardcoded scores
* fake names
* fake recommendations
* demo tasks
* static dashboard numbers
* placeholder analytics
* fake interview results
* fake skill gaps
* local fallback data

Remove these from production flows.

Use real Supabase data.

Fallback UI is allowed only for errors or empty states, never as fake successful data.

## 19. FINAL END-TO-END TEST

Test using a completely NEW account:

Register
→ Onboarding
→ Dashboard
→ Upload real resume
→ Analyze resume
→ Verify skills saved
→ Verify skill gaps generated
→ Verify readiness calculated
→ Generate roadmap
→ Complete roadmap task
→ Verify progress saved
→ Take assessment
→ Verify skill score changes
→ Verify skill gaps change
→ Verify roadmap adapts
→ Start interview
→ Submit answer
→ Verify AI evaluation saved
→ Check analytics
→ Ask AI Assistant
→ Logout
→ Login again
→ Verify all data persists

## FINAL REQUIREMENT

Do not stop at "build passes".

Actually run and test the application.

Find every remaining mock/static feature and convert it to real functionality.

Fix all API, database, authentication, Edge Function, TypeScript, runtime and integration errors.

The final result must be a genuinely functional full-stack SkillForge AI where the UI is only a presentation layer over real Supabase data and real AI logic.

**DO NOT REDESIGN THE EXISTING FRONTEND.**
**DO NOT STOP UNTIL THE EXISTING FEATURES WORK WITH REAL DATA.**
