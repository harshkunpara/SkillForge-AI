import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "http://localhost:8443",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5500",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";

  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : "http://localhost:8443",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  // IMPORTANT: Handle browser preflight BEFORE auth/database/AI logic.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }

  const requestId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        req,
        {
          success: false,
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Only POST requests are allowed.",
            retryable: false,
          },
          request_id: requestId,
        },
        405
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        req,
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid authorization header.",
            retryable: false,
          },
          request_id: requestId,
        },
        401
      );
    }

    const supabaseUrl = "https://rwfzmjtqyglzrgxzfyei.supabase.co";
    const serviceRoleKey = "sb_publishable_FkFnODPmW9dINYw_m927GQ_1mbWCsvX";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured.");
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        req,
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired session.",
            retryable: false,
          },
          request_id: requestId,
        },
        401
      );
    }

    // ------------------------------------------
    // Fetch profile
    // ------------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("target_career, experience_level")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profile fetch failed: ${profileError.message}`);
    }

    const targetCareer =
      profile?.target_career?.trim() || "Software Engineer";

    // ------------------------------------------
    // Fetch REAL user skills
    // ------------------------------------------

    const {
      data: userSkills,
      error: skillsError,
    } = await supabase
      .from("user_skills")
      .select(
        "skill_name, category, current_score, confidence, evidence, source"
      )
      .eq("user_id", user.id);

    if (skillsError) {
      throw new Error(`Skills fetch failed: ${skillsError.message}`);
    }

    const skills = userSkills || [];

    // IMPORTANT:
    // Do not generate fake skill gaps if there are no real skills.
    if (skills.length === 0) {
      return jsonResponse(req, {
        success: false,
        error: {
          code: "NO_SKILLS",
          message:
            "No analyzed skills found. Upload and analyze a resume before calculating skill gaps.",
          retryable: false,
        },
        request_id: requestId,
      }, 422);
    }

    // ------------------------------------------
    // AI configuration
    // ------------------------------------------

    const apiKey =
      Deno.env.get("ANTHROPIC_API_KEY") ||
      Deno.env.get("AI_API_KEY");

    if (!apiKey || apiKey.includes("REPLACE") || apiKey.length <= 20) {
      return jsonResponse(req, {
        success: false,
        error: {
          code: "AI_NOT_CONFIGURED",
          message:
            "AI API key is not configured on the Supabase Edge Function.",
          retryable: false,
        },
        request_id: requestId,
      }, 503);
    }

    // ------------------------------------------
    // Prepare REAL student data for AI
    // ------------------------------------------

    const skillsList = skills
      .map((skill: any) => {
        const score = Number(skill.current_score ?? 0);

        return [
          `Skill: ${skill.skill_name}`,
          `Category: ${skill.category || "Unknown"}`,
          `Current score: ${score}/100`,
          `Confidence: ${skill.confidence ?? "Unknown"}`,
          `Source: ${skill.source || "Unknown"}`,
          `Evidence: ${skill.evidence || "None"}`,
        ].join(" | ");
      })
      .join("\n");

    const { default: Anthropic } = await import(
      "https://esm.sh/@anthropic-ai/sdk@0.27.3"
    );

    const anthropic = new Anthropic({
      apiKey,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `
You are the skill-gap engine for SkillForge AI.

Analyze THIS student's REAL skills and target career.

Target career:
${targetCareer}

Experience level:
${profile?.experience_level || "beginner"}

REAL STUDENT SKILLS:
${skillsList}

Identify the most important skills required for the target career.

For each required skill:
- Use the student's actual current score if the skill exists.
- If the skill is genuinely missing, current_score must be 0.
- Do not invent evidence.
- Do not invent skills the student already has.
- required_score must represent the level realistically needed for this target career.
- Only return skills where required_score > current_score.

Return ONLY valid JSON.

Format:

[
  {
    "skill_name": "string",
    "current_score": 0,
    "required_score": 0,
    "priority": "critical",
    "reason": "string",
    "recommended_action": "string"
  }
]

Priority must be one of:
critical
high
medium
low

Return maximum 8 most important gaps.
`,
        },
      ],
    });

    // ------------------------------------------
    // Parse AI response safely
    // ------------------------------------------

    const textBlock = message.content.find(
      (item: any) => item.type === "text"
    );

    if (!textBlock || !("text" in textBlock)) {
      throw new Error("AI returned no text response.");
    }

    const raw = String(textBlock.text).trim();

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let aiGaps: any[];

    try {
      aiGaps = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `AI returned invalid JSON: ${cleaned.slice(0, 500)}`
      );
    }

    if (!Array.isArray(aiGaps)) {
      throw new Error("AI response is not an array.");
    }

    // ------------------------------------------
    // Validate + normalize gaps
    // ------------------------------------------

    const gaps = aiGaps
      .map((gap: any) => {
        const currentScore = Math.max(
          0,
          Math.min(100, Number(gap.current_score) || 0)
        );

        const requiredScore = Math.max(
          0,
          Math.min(100, Number(gap.required_score) || 0)
        );

        return {
          skill_name: String(gap.skill_name || "").trim(),
          current_score: currentScore,
          required_score: requiredScore,
          gap: Math.max(0, requiredScore - currentScore),
          priority: ["critical", "high", "medium", "low"].includes(
            gap.priority
          )
            ? gap.priority
            : "medium",
          reason: String(gap.reason || "").trim(),
          recommended_action: String(
            gap.recommended_action || ""
          ).trim(),
        };
      })
      .filter(
        (gap) =>
          gap.skill_name &&
          gap.required_score > gap.current_score
      )
      .slice(0, 8);

    // ------------------------------------------
    // Replace existing gaps atomically as much
    // as possible for this user.
    // ------------------------------------------

    const { error: deleteError } = await supabase
      .from("skill_gaps")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error(
        `Existing skill gaps could not be cleared: ${deleteError.message}`
      );
    }

    if (gaps.length > 0) {
      const rows = gaps.map((gap) => ({
        user_id: user.id,
        skill_name: gap.skill_name,
        current_score: gap.current_score,
        required_score: gap.required_score,
        gap: gap.gap,
        priority: gap.priority,
        reason: gap.reason,
        recommended_action: gap.recommended_action,
      }));

      const { error: insertError } = await supabase
        .from("skill_gaps")
        .insert(rows);

      if (insertError) {
        throw new Error(
          `Skill gaps could not be saved: ${insertError.message}`
        );
      }
    }

    // ------------------------------------------
    // Calculate readiness from REAL skills,
    // not only the gaps.
    // ------------------------------------------

    const totalSkillScore = skills.reduce(
      (sum: number, skill: any) =>
        sum + Math.max(0, Math.min(100, Number(skill.current_score) || 0)),
      0
    );

    const averageSkillScore =
      skills.length > 0
        ? totalSkillScore / skills.length
        : 0;

    const totalGap = gaps.reduce(
      (sum, gap) => sum + gap.gap,
      0
    );

    const averageGap =
      gaps.length > 0
        ? totalGap / gaps.length
        : 0;

    const readiness = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          averageSkillScore * 0.7 +
          Math.max(0, 100 - averageGap) * 0.3
        )
      )
    );

    // ------------------------------------------
    // Save readiness
    // ------------------------------------------

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        placement_readiness: readiness,
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw new Error(
        `Readiness update failed: ${profileUpdateError.message}`
      );
    }

    const { error: historyError } = await supabase
      .from("readiness_history")
      .insert({
        user_id: user.id,
        score: readiness,
        recorded_at: new Date().toISOString(),
      });

    if (historyError) {
      console.warn(
        "Readiness history insert failed:",
        historyError.message
      );
    }

    const { error: activityError } = await supabase
      .from("activity_log")
      .insert({
        user_id: user.id,
        type: "gaps_calculated",
        description: `Skill gaps recalculated for ${targetCareer}`,
      });

    if (activityError) {
      console.warn(
        "Activity log insert failed:",
        activityError.message
      );
    }

    return jsonResponse(req, {
      success: true,
      gaps,
      readiness,
      target_career: targetCareer,
      analyzed_skills_count: skills.length,
      request_id: requestId,
    });
  } catch (err) {
    console.error("calculate-gaps error:", err);

    return jsonResponse(
      req,
      {
        success: false,
        error: {
          code: "CALCULATE_GAPS_FAILED",
          message:
            err instanceof Error ? err.message : String(err),
          retryable: true,
        },
        request_id: requestId,
      },
      500
    );
  }
});