import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5500",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: corsHeaders,
    });
  }

  const requestId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Missing authorization header",
          retryable: false
        },
        request_id: requestId
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return jsonResponse({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Unauthorized",
          retryable: false
        },
        request_id: requestId
      }, 400);
    }

    // Fetch user profile and skills
    const [profileRes, skillsRes] = await Promise.all([
      supabase.from("profiles").select("target_career,experience_level").eq("id", user.id).maybeSingle(),
      supabase.from("user_skills").select("skill_name,category,current_score").eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    const userSkills = skillsRes.data || [];
    const targetCareer = profile?.target_career || "Software Engineer";

    let gaps: any[] = [];

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("AI_API_KEY");
    const hasValidKey = apiKey && !apiKey.includes("REPLACE") && apiKey.length > 20;

    if (hasValidKey) {
      try {
        const { default: Anthropic } = await import("https://esm.sh/@anthropic-ai/sdk@0.27.3");
        const anthropic = new Anthropic({ apiKey });

        const skillsList = userSkills.map((s: any) => `${s.skill_name}: ${s.current_score}%`).join(", ");

        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are a career advisor. Calculate skill gaps for a student targeting: ${targetCareer}.
Experience level: ${profile?.experience_level || "beginner"}

Student's current skills (name: score%):
${skillsList || "No skills assessed yet"}

For the target role, identify the most important skills needed. For each skill:
- If the student has it: calculate gap between their score and the required score
- If the student doesn't have it: set current_score to 0

Return a JSON array of the TOP 8 most critical gaps:
[
  {
    "skill_name": "<skill>",
    "current_score": <0-100>,
    "required_score": <0-100>,
    "priority": "<critical|high|medium|low>",
    "reason": "<why this skill matters>",
    "recommended_action": "<specific step>"
  }
]
Only include skills where required_score > current_score.
Return ONLY valid JSON array.`
          }]
        });

        const raw = (message.content[0] as { text: string }).text.trim();
        const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
        gaps = JSON.parse(cleaned);
      } catch (aiErr) {
        console.warn("AI call failed, using demo gaps:", String(aiErr));
        gaps = []; // Fall through to demo
      }
    }

    // Demo fallback when no AI key or AI failed
    if (gaps.length === 0) {
      const roleGaps: Record<string, any[]> = {
        default: [
          { skill_name: "Data Structures", current_score: 35, required_score: 80, priority: "critical", reason: "Core requirement for technical interviews", recommended_action: "Complete a DSA course on LeetCode or HackerRank" },
          { skill_name: "System Design", current_score: 20, required_score: 75, priority: "critical", reason: "Essential for senior engineering roles", recommended_action: "Study system design patterns and practice whiteboard exercises" },
          { skill_name: "TypeScript", current_score: 45, required_score: 80, priority: "high", reason: "Industry standard for modern web development", recommended_action: "Build a typed full-stack project" },
          { skill_name: "Testing", current_score: 30, required_score: 70, priority: "high", reason: "Required for production-quality code", recommended_action: "Learn Jest and write tests for existing projects" },
          { skill_name: "DevOps", current_score: 15, required_score: 60, priority: "high", reason: "CI/CD knowledge expected at all levels", recommended_action: "Set up a GitHub Actions pipeline for a project" },
          { skill_name: "SQL", current_score: 55, required_score: 80, priority: "medium", reason: "Database skills needed for backend work", recommended_action: "Practice complex queries and learn query optimization" },
        ],
      };

      gaps = (roleGaps[targetCareer.toLowerCase()] || roleGaps.default).map((g: any) => {
        const existing = userSkills.find((s: any) => s.skill_name.toLowerCase() === g.skill_name.toLowerCase());
        if (existing) {
          return { ...g, current_score: existing.current_score, gap: Math.max(0, g.required_score - existing.current_score) };
        }
        return { ...g, gap: g.required_score - g.current_score };
      }).filter((g: any) => (g.gap || g.required_score - g.current_score) > 0);
    }

    // Delete existing gaps and replace with fresh ones
    await supabase.from("skill_gaps").delete().eq("user_id", user.id);

    for (const gap of gaps) {
      await supabase.from("skill_gaps").insert({
        user_id: user.id,
        skill_name: gap.skill_name,
        current_score: gap.current_score,
        required_score: gap.required_score,
        gap: gap.required_score - gap.current_score,
        priority: gap.priority,
        reason: gap.reason,
        recommended_action: gap.recommended_action,
      });
    }

    // Recalculate placement readiness
    const avgCurrent = gaps.reduce((s: number, g: any) => s + g.current_score, 0) / Math.max(gaps.length, 1);
    const avgRequired = gaps.reduce((s: number, g: any) => s + g.required_score, 0) / Math.max(gaps.length, 1);
    const readiness = Math.min(100, Math.round((avgCurrent / Math.max(avgRequired, 1)) * 85));

    await supabase.from("profiles").update({ placement_readiness: readiness }).eq("id", user.id);
    await supabase.from("readiness_history").insert({ user_id: user.id, score: readiness, recorded_at: new Date().toISOString() });
    await supabase.from("activity_log").insert({ user_id: user.id, type: "gaps_calculated", description: `Skill gaps recalculated for ${targetCareer}` });

    return jsonResponse({ success: true, gaps, readiness });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: String(err),
        retryable: false
      },
      request_id: requestId
    }, 400);
  }
});
