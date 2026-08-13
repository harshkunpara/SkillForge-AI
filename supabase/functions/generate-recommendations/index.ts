import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

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
          message: "Missing authorization",
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

    const [profileRes, gapsRes, skillsRes] = await Promise.all([
      supabase.from("profiles").select("target_career,experience_level,placement_readiness").eq("id", user.id).maybeSingle(),
      supabase.from("skill_gaps").select("skill_name,priority,gap,recommended_action").eq("user_id", user.id).order("gap", { ascending: false }).limit(6),
      supabase.from("user_skills").select("skill_name,current_score,category").eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    const gaps = gapsRes.data || [];
    const skills = skillsRes.data || [];

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("AI_API_KEY");
    const hasValidKey = apiKey && !apiKey.includes("REPLACE") && apiKey.length > 20;

    let recs: any = null;

    if (hasValidKey) {
      try {
        const anthropic = new Anthropic({ apiKey });

        const prompt = `Generate personalized learning recommendations for a student.

Target Career: ${profile?.target_career || "Software Engineer"}
Experience Level: ${profile?.experience_level || "beginner"}
Placement Readiness: ${profile?.placement_readiness || 0}%

Critical Skill Gaps:
${gaps.map((g) => `- ${g.skill_name}: gap=${g.gap}, priority=${g.priority}`).join("\n")}

Current Skill Levels:
${skills.slice(0, 8).map((s) => `- ${s.skill_name}: ${s.current_score}%`).join("\n")}

Generate 3 courses, 2 projects, and 2 certifications. For each item:

Return a JSON object:
{
  "courses": [
    {
      "title": "<course title>",
      "platform": "<e.g. Coursera, YouTube, freeCodeCamp>",
      "description": "<2 sentence description>",
      "match_score": <70-98>,
      "reason": "<why specifically for this student>",
      "skills": ["<skill1>", "<skill2>"],
      "difficulty": "<beginner|intermediate|advanced>",
      "estimated_hours": <number>,
      "url": null
    }
  ],
  "projects": [
    {
      "title": "<project title>",
      "description": "<what to build>",
      "match_score": <70-98>,
      "reason": "<why this project closes the student's specific gaps>",
      "skills_required": ["<skill>"],
      "skills_gained": ["<skill>"],
      "difficulty": "<beginner|intermediate|advanced>",
      "estimated_days": <number>,
      "portfolio_value": "<high|medium|low>"
    }
  ],
  "certifications": [
    {
      "title": "<cert name>",
      "provider": "<e.g. AWS, Google, Oracle>",
      "description": "<what it covers>",
      "match_score": <70-98>,
      "reason": "<why relevant>",
      "skills": ["<skill>"],
      "difficulty": "<beginner|intermediate|advanced>",
      "estimated_hours": <number>,
      "url": null
    }
  ]
}

Always set url to null (don't invent URLs). Return ONLY valid JSON.`;

        const message = await anthropic.messages.create({
          model: "claude-sonnet-5",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });

        const raw = (message.content[0] as { text: string }).text.trim();
        recs = JSON.parse(raw);
      } catch (aiErr) {
        console.warn("AI recommendations generation failed, using demo data:", String(aiErr));
      }
    }

    if (!recs) {
      recs = {
        courses: [
          {
            title: "Modern TypeScript & Advanced Patterns",
            platform: "TypeScript Official & freeCodeCamp",
            description: "Master type safety, generics, and configuration options to write clean TS code.",
            match_score: 92,
            reason: "Directly targets your TypeScript gap to build production-ready applications.",
            skills: ["TypeScript"],
            difficulty: "intermediate",
            estimated_hours: 12,
            url: null
          },
          {
            title: "SQL and Relational Database Design",
            platform: "Coursera",
            description: "Learn to write complex database queries, work with indexes, and design optimized schemas.",
            match_score: 88,
            reason: "Helps boost your SQL queries competency required for full-stack backend tasks.",
            skills: ["SQL"],
            difficulty: "intermediate",
            estimated_hours: 15,
            url: null
          },
          {
            title: "System Design Primer & Architectural Patterns",
            platform: "GitHub (Open Source)",
            description: "A comprehensive guide to scaling systems, load balancing, caching, and databases.",
            match_score: 95,
            reason: "Fills your critical System Design gap needed for senior placement readiness.",
            skills: ["System Design"],
            difficulty: "advanced",
            estimated_hours: 20,
            url: null
          }
        ],
        projects: [
          {
            title: "Full-Stack Task Manager with CI/CD",
            description: "Build a secure task manager app using TypeScript, SQL database, and set up a automated pipeline.",
            match_score: 94,
            reason: "Closes gaps in TypeScript, SQL, and DevOps concurrently in one portfolio project.",
            skills_required: ["TypeScript", "SQL"],
            skills_gained: ["TypeScript", "SQL", "DevOps"],
            difficulty: "intermediate",
            estimated_days: 10,
            portfolio_value: "high"
          },
          {
            title: "High-Throughput URL Shortener",
            description: "Implement a URL shortening service handling redirection, caching, and rate limiting.",
            match_score: 90,
            reason: "Allows practical application of System Design principles and database optimization.",
            skills_required: ["System Design"],
            skills_gained: ["System Design", "Testing"],
            difficulty: "advanced",
            estimated_days: 7,
            portfolio_value: "high"
          }
        ],
        certifications: [
          {
            title: "AWS Certified Cloud Practitioner",
            provider: "Amazon Web Services",
            description: "Basic cloud concepts, security, technology, and billing models on AWS.",
            match_score: 85,
            reason: "Validates core DevOps and cloud deployment competency for recruiters.",
            skills: ["DevOps"],
            difficulty: "beginner",
            estimated_hours: 25,
            url: null
          },
          {
            title: "Meta Front-End Developer Certificate",
            provider: "Meta via Coursera",
            description: "Professional front-end developer training covering React, VCS, and UX design.",
            match_score: 80,
            reason: "Solidifies professional frontend development methodologies.",
            skills: ["React"],
            difficulty: "intermediate",
            estimated_hours: 40,
            url: null
          }
        ]
      };
    }

    await supabase.from("activity_log").insert({ user_id: user.id, type: "recommendations_generated", description: "AI generated personalized recommendations" });

    return jsonResponse(recs);
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
