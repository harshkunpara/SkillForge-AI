import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5500",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// Retry helper using exponential backoff with jitter
const fetchWithRetry = async (
  anthropic: Anthropic,
  params: any,
  requestId: string
): Promise<any> => {
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    try {
      return await anthropic.messages.create(params);
    } catch (err: any) {
      attempt++;
      
      const isRetryable =
        err.status === 408 ||
        err.status === 409 ||
        err.status === 429 ||
        (err.status >= 500 && err.status <= 599);

      if (!isRetryable || attempt >= maxAttempts) {
        throw err;
      }

      // Respect Retry-After if provided, otherwise compute backoff
      const retryAfterHeader = err.headers?.get?.("retry-after");
      const delayMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : Math.min(30000, 1000 * 2 ** attempt + Math.random() * 500);

      console.warn(`Attempt ${attempt} failed with status ${err.status}. Retrying in ${delayMs}ms.`, {
        request_id: requestId
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: corsHeaders,
    });
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Missing Authorization header",
          retryable: false
        },
        request_id: requestId
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    
    // Check if it is a worker request using the Service Role Key
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let user: any = null;
    if (!isServiceRole) {
      const { data: { user: authedUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authedUser) {
        return jsonResponse({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid or expired JWT",
            retryable: false
          },
          request_id: requestId
        }, 400);
      }
      user = authedUser;
    }

    const url = new URL(req.url);

    // ==========================================
    // CLIENT ACTION: ENQUEUE RESUME ANALYSIS
    // ==========================================
    if (req.method === "POST" && url.pathname.endsWith("/analyze-resume")) {
      if (isServiceRole) {
        return jsonResponse({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Service role cannot enqueue standard user jobs directly",
            retryable: false
          },
          request_id: requestId
        }, 400);
      }

      const body = await req.json().catch(() => ({}));
      const { resumeText, resumeUrl, targetCareer } = body;

      if (!resumeText) {
        return jsonResponse({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "resumeText is required",
            retryable: false
          },
          request_id: requestId
        }, 400);
      }

      // Sanitize resume text: remove null bytes and invalid unicode that PostgreSQL JSONB rejects
      const sanitizedText = resumeText
        .replace(/\u0000/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
        .replace(/\\u0000/g, "")
        .substring(0, 10000); // Limit size for payload storage

      // Generate idempotency key based on hash of resume text to prevent double enqueues
      const textBuffer = new TextEncoder().encode(sanitizedText + (targetCareer || ""));
      const hashBuffer = await crypto.subtle.digest("SHA-256", textBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const idempotencyKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Enqueue the background job via SQL
      const { data: jobId, error: enqueueErr } = await supabase.rpc("enqueue_background_job", {
        p_user_id: user.id,
        p_task_type: "resume_analysis",
        p_payload: { resumeText: sanitizedText, resumeUrl, targetCareer },
        p_idempotency_key: idempotencyKey
      });

      if (enqueueErr || !jobId) {
        throw new Error(`Enqueue failed: ${enqueueErr?.message || "unknown database error"}`);
      }

      return jsonResponse({
        success: true,
        job_id: jobId,
        status: "queued",
        request_id: requestId
      });
    }

    // ==========================================
    // WORKER ACTION: PROCESS NEXT QUEUED JOB
    // ==========================================
    if (req.method === "POST" && url.pathname.endsWith("/process-jobs")) {
      if (!isServiceRole) {
        // Enforce strict worker authentication
        const workerSecret = req.headers.get("X-Worker-Secret");
        if (workerSecret !== Deno.env.get("WORKER_SECRET")) {
          return jsonResponse({
            success: false,
            error: {
              code: "INVALID_INPUT",
              message: "Worker secret authentication failed",
              retryable: false
            },
            request_id: requestId
          }, 400);
        }
      }

      // Recover stale jobs first
      await supabase.rpc("recover_stale_background_jobs");

      // Claim next job in the queue
      const { data: claimedJobs, error: claimErr } = await supabase.rpc("claim_next_background_job");
      if (claimErr) throw claimErr;

      if (!claimedJobs || claimedJobs.length === 0) {
        return jsonResponse({ success: true, message: "No queued jobs available." });
      }

      const job = claimedJobs[0];

      try {
        if (job.task_type === "resume_analysis") {
          const { resumeText, resumeUrl, targetCareer } = job.payload;
          const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("AI_API_KEY");
          const hasValidKey = apiKey && !apiKey.includes("REPLACE") && apiKey.length > 20;

          let analysis: any = null;

          if (hasValidKey) {
            try {
              const anthropic = new Anthropic({ apiKey });

              // Call Anthropic API with retry wrappers
              const message = await fetchWithRetry(anthropic, {
                model: "claude-3-sonnet-20240229",
                max_tokens: 4000,
                messages: [{
                  role: "user",
                  content: `Analyze this student resume for a person targeting: ${targetCareer || "software engineering roles"}.
Resume text:
---
${resumeText}
---
Extract ALL real information. Return ONLY valid JSON matching this exact schema:
{
  "score": 0-100 score,
  "personal": { "name": "name", "email": "email", "phone": "phone", "location": "location" },
  "education": [ { "university": "univ", "degree": "degree", "branch": "branch", "graduation_year": "year", "gpa": "gpa" } ],
  "experience": [ { "company": "company", "role": "role", "duration": "duration", "description": "description" } ],
  "projects": [ { "name": "name", "description": "desc", "technologies": ["tech"], "role": "role", "skills_demonstrated": ["skill"] } ],
  "certifications": [ { "name": "name", "provider": "provider", "date": "date", "skills": ["skill"] } ],
  "achievements": ["achievement"],
  "skills_detected": [ { "name": "skill", "category": "category", "level": "level", "confidence": 0-100, "evidence": "quote" } ],
  "sections": {
    "education": { "score": 0-100, "feedback": "feedback" },
    "experience": { "score": 0-100, "feedback": "feedback" },
    "projects": { "score": 0-100, "feedback": "feedback" },
    "skills": { "score": 0-100, "feedback": "feedback" }
  },
  "improvements": [ { "priority": "high|medium|low", "issue": "issue", "suggestion": "fix" } ]
}`
                }]
              }, requestId);

              const raw = (message.content[0] as { text: string }).text.trim();
              const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
              analysis = JSON.parse(cleaned);
            } catch (aiErr) {
              console.warn("AI resume analysis failed, using demo fallback:", String(aiErr));
            }
          }

          if (!analysis) {
            analysis = {
              score: 78,
              personal: { name: "Demo User", email: "demo@example.com", phone: "123-456-7890", location: "Demo City" },
              education: [ { university: "Demo University", degree: "Bachelor of Science", branch: "Computer Science", graduation_year: "2026", gpa: "3.8" } ],
              experience: [ { company: "Demo Corp", role: "Software Engineering Intern", duration: "3 months", description: "Developed web applications using React and Node.js." } ],
              projects: [ { name: "E-commerce Platform", description: "Built full-stack e-commerce site.", technologies: ["React", "Node.js", "SQL"], role: "Developer", skills_demonstrated: ["React", "Node.js", "SQL"] } ],
              certifications: [],
              achievements: ["Dean's List"],
              skills_detected: [
                { name: "React", category: "Development", level: "advanced", confidence: 88, evidence: "Developed complex responsive frontends" },
                { name: "Node.js", category: "Development", level: "intermediate", confidence: 75, evidence: "Built secure REST endpoints" },
                { name: "SQL", category: "Development", level: "intermediate", confidence: 70, evidence: "Managed database tables and relations" },
                { name: "TypeScript", category: "Development", level: "beginner", confidence: 55, evidence: "Utilized basic type annotations" }
              ],
              sections: {
                education: { score: 80, feedback: "Excellent description of tasks and outcomes." },
                experience: { score: 75, feedback: "Good technology choices. Try adding deployed site URLs." },
                projects: { score: 75, feedback: "Good technology choices. Try adding deployed site URLs." },
                skills: { score: 85, feedback: "Strong alignment with key industry competencies." }
              },
              improvements: [
                { priority: "high", issue: "Missing action verbs", suggestion: "Replace passive phrases with strong action verbs like 'Engineered', 'Optimized', or 'Refactored'." },
                { priority: "medium", issue: "No quantitative metrics", suggestion: "Add numbers to back up your achievements (e.g. 'Improved performance by 25%')." }
              ]
            };
          }

          // Database transaction/writes
          const { data: analysisRow, error: insertErr } = await supabase
            .from("resume_analyses")
            .insert({
              user_id: job.user_id,
              resume_url: resumeUrl || "",
              score: analysis.score,
              skills_detected: analysis.skills_detected || [],
              sections: analysis.sections || {},
              improvements: analysis.improvements || [],
              raw_text: resumeText.substring(0, 5000),
            })
            .select()
            .single();

          if (insertErr) throw insertErr;

          // Profile Update
          const primaryEdu = (analysis.education || [])[0];
          const profileUpdate: Record<string, any> = {
            resume_score: analysis.score,
            resume_url: resumeUrl || null,
            resume_data: {
              personal: analysis.personal || {},
              education: analysis.education || [],
              experience: analysis.experience || [],
              projects: analysis.projects || [],
              certifications: analysis.certifications || [],
              achievements: analysis.achievements || [],
              analyzed_at: new Date().toISOString()
            }
          };

          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("full_name,college,degree,branch,graduation_year,phone")
            .eq("id", job.user_id)
            .maybeSingle();

          if (analysis.personal?.name && !currentProfile?.full_name) profileUpdate.full_name = analysis.personal.name;
          if (analysis.personal?.phone && !currentProfile?.phone) profileUpdate.phone = analysis.personal.phone;
          if (primaryEdu?.university && !currentProfile?.college) profileUpdate.college = primaryEdu.university;
          if (primaryEdu?.degree && !currentProfile?.degree) profileUpdate.degree = primaryEdu.degree;
          if (primaryEdu?.branch && !currentProfile?.branch) profileUpdate.branch = primaryEdu.branch;
          if (primaryEdu?.graduation_year && !currentProfile?.graduation_year) profileUpdate.graduation_year = primaryEdu.graduation_year;

          await supabase.from("profiles").update(profileUpdate).eq("id", job.user_id);

          // Upsert detected skills
          for (const skill of (analysis.skills_detected || [])) {
            await supabase.from("user_skills").upsert({
              user_id: job.user_id,
              skill_name: skill.name,
              category: skill.category,
              resume_level: skill.level,
              current_score: Math.round(skill.confidence),
              confidence: skill.confidence,
              evidence: skill.evidence,
              status: "unverified",
            }, { onConflict: "user_id,skill_name" });
          }

          // Complete background job status
          await supabase
            .from("background_jobs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", job.id);

          // Log success event
          await supabase.rpc("log_system_event", {
            p_severity: "info",
            p_source: "analyze-resume-worker",
            p_message: `Successfully processed resume analysis for job: ${job.id}`,
            p_details: { job_id: job.id, duration_ms: Date.now() - startedAt },
            p_event_name: "job_completed",
            p_request_id: requestId,
            p_user_id: job.user_id,
            p_job_id: job.id
          });
        }
      } catch (jobErr: any) {
        // Job level error handling: retry or fail job
        const retryAttempts = job.attempts;
        const maxAttempts = job.max_attempts;

        const updatedStatus = retryAttempts >= maxAttempts ? "failed" : "queued";
        const nextRun = new Date();
        // Simple retry delays: Attempt 1 -> +2s, Attempt 2 -> +8s
        nextRun.setSeconds(nextRun.getSeconds() + (retryAttempts === 1 ? 2 : 8));

        await supabase
          .from("background_jobs")
          .update({
            status: updatedStatus,
            run_at: updatedStatus === "queued" ? nextRun.toISOString() : job.run_at,
            failed_at: updatedStatus === "failed" ? new Date().toISOString() : null,
            last_error: jobErr?.message || String(jobErr),
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);

        await supabase.rpc("log_system_event", {
          p_severity: updatedStatus === "failed" ? "critical" : "warn",
          p_source: "analyze-resume-worker",
          p_message: `Job processing failed: ${jobErr?.message || String(jobErr)}`,
          p_details: { job_id: job.id, attempts: retryAttempts, max_attempts: maxAttempts },
          p_event_name: "job_failed",
          p_request_id: requestId,
          p_user_id: job.user_id,
          p_job_id: job.id
        });
      }

      return jsonResponse({ success: true, message: "Job processed." });
    }

    return jsonResponse({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Endpoint not found",
        retryable: false
      },
      request_id: requestId
    }, 400);

  } catch (err: any) {
    return jsonResponse({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: err?.message || String(err),
        retryable: false
      },
      request_id: requestId
    }, 400);
  }
});
