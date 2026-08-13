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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
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

    // 1. Fetch input data
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_career, placement_readiness")
      .eq("id", user.id)
      .maybeSingle();

    const { data: userSkills } = await supabase
      .from("user_skills")
      .select("skill_name, current_score, category, status")
      .eq("user_id", user.id)
      .in("status", ["verified", "partially_verified"]);

    const { data: skillGaps } = await supabase
      .from("skill_gaps")
      .select("skill_name, current_score, required_score, gap, priority, reason")
      .eq("user_id", user.id)
      .gt("gap", 0)
      .order("gap", { ascending: false });

    // Fetch existing active roadmap to archive and extract completed tasks
    const { data: activeRoadmap } = await supabase
      .from("roadmaps")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let completedTasksList: any[] = [];
    if (activeRoadmap) {
      const { data: phases } = await supabase
        .from("roadmap_phases")
        .select("id")
        .eq("roadmap_id", activeRoadmap.id);
      
      if (phases && phases.length > 0) {
        const phaseIds = phases.map(p => p.id);
        const { data: completedTasks } = await supabase
          .from("roadmap_tasks")
          .select("name, type, done, completed_at, skill_name")
          .in("phase_id", phaseIds)
          .eq("done", true);
        
        if (completedTasks) {
          completedTasksList = completedTasks;
        }
      }
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("AI_API_KEY");
    const hasValidKey = apiKey && !apiKey.includes("REPLACE") && apiKey.length > 20;

    let roadmapData: any = null;

    if (hasValidKey) {
      try {
        // Call Anthropic Claude to generate customized phases & tasks
        const anthropic = new Anthropic({ apiKey });

        const prompt = `You are a learning path generator. Create a personalized learning roadmap for a student with this profile:
- Target Career: ${profile?.target_career || "Software Engineer"}
- Current Readiness: ${profile?.placement_readiness || 0}%

Current Verified/Partially Verified Skills (score/100):
${userSkills || [] ? (userSkills || []).map(s => `- ${s.skill_name}: ${s.current_score} (${s.status})`).join("\n") : "None"}

Active Gaps:
${skillGaps || [] ? (skillGaps || []).map(g => `- ${g.skill_name}: Gap of ${g.gap} points (current: ${g.current_score}, required: ${g.required_score}, priority: ${g.priority})`).join("\n") : "None"}

Generate 4 phases strictly mapping to the student's gaps:
- Phase 1: Diagnostic & Foundation (focus on 'assessment_required' gaps)
- Phase 2: High-Priority Gap Closure (focus on 'critical' and 'high' gaps)
- Phase 3: Medium-Priority Improvement (focus on 'medium' priority gaps)
- Phase 4: Advanced & Interview Prep (focus on 'low' priority gaps and mock interview preparation)

Rules:
- DO NOT generate beginner tasks for skills already above their required score.
- Every task must link back to a real gap.
- Generate EXACTLY this JSON structure:
{
  "phases": [
    {
      "phase_number": 1,
      "title": "Phase Title",
      "duration": "Duration e.g. 4 weeks",
      "skills": ["SQL", "React"],
      "tasks": [
        {
          "name": "Specific task name matching the skill e.g. SQL Joins and Aggregation",
          "type": "course|project|assessment|practice",
          "skill_name": "SQL",
          "estimated_hours": 8,
          "difficulty": "beginner|intermediate|advanced",
          "learning_objectives": ["Obj 1", "Obj 2"],
          "practice_tasks": ["Task 1"],
          "project_tasks": ["Project 1"]
        }
      ]
    }
  ]
}
Return ONLY valid JSON. No conversational text or markdown blocks.`;

        const message = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        });

        const raw = (message.content[0] as { text: string }).text.trim();
        const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
        roadmapData = JSON.parse(cleaned);
      } catch (aiErr) {
        console.warn("AI roadmap generation failed, using demo data:", String(aiErr));
      }
    }

    if (!roadmapData) {
      // Demo roadmap fallback
      roadmapData = {
        phases: [
          {
            phase_number: 1,
            title: "Diagnostic & Foundation",
            duration: "2 weeks",
            skills: ["Data Structures", "TypeScript"],
            tasks: [
              {
                name: "Data Structures Basics & Practice",
                type: "practice",
                skill_name: "Data Structures",
                estimated_hours: 10,
                difficulty: "beginner",
                learning_objectives: ["Understand arrays, linked lists, stacks, and queues", "Implement basic operations"],
                practice_tasks: ["Implement a Singly Linked List", "Reverse a String using Stack"],
                project_tasks: []
              },
              {
                name: "TypeScript Essentials",
                type: "course",
                skill_name: "TypeScript",
                estimated_hours: 8,
                difficulty: "beginner",
                learning_objectives: ["Static typing basics", "Interfaces and Types"],
                practice_tasks: ["Convert JS code to TypeScript"],
                project_tasks: []
              }
            ]
          },
          {
            phase_number: 2,
            title: "High-Priority Gap Closure",
            duration: "4 weeks",
            skills: ["System Design", "Testing"],
            tasks: [
              {
                name: "System Design Fundamentals",
                type: "course",
                skill_name: "System Design",
                estimated_hours: 15,
                difficulty: "intermediate",
                learning_objectives: ["Scalability and Load Balancers", "Caching strategies"],
                practice_tasks: ["Design a URL shortener"],
                project_tasks: []
              },
              {
                name: "Unit Testing with Jest",
                type: "practice",
                skill_name: "Testing",
                estimated_hours: 8,
                difficulty: "intermediate",
                learning_objectives: ["Write unit tests", "Mocking dependencies"],
                practice_tasks: ["Write tests for an API handler"],
                project_tasks: []
              }
            ]
          },
          {
            phase_number: 3,
            title: "Medium-Priority Improvement",
            duration: "3 weeks",
            skills: ["SQL", "DevOps"],
            tasks: [
              {
                name: "Advanced SQL Queries",
                type: "practice",
                skill_name: "SQL",
                estimated_hours: 10,
                difficulty: "intermediate",
                learning_objectives: ["Complex Joins & Subqueries", "Window Functions"],
                practice_tasks: ["Solve 15 SQL query challenges"],
                project_tasks: []
              },
              {
                name: "CI/CD with GitHub Actions",
                type: "project",
                skill_name: "DevOps",
                estimated_hours: 12,
                difficulty: "intermediate",
                learning_objectives: ["Automating builds and tests", "Deployment workflows"],
                practice_tasks: ["Create a GitHub Action workflow"],
                project_tasks: ["Deploy a Node/React app automatically on commit"]
              }
            ]
          },
          {
            phase_number: 4,
            title: "Advanced & Interview Prep",
            duration: "2 weeks",
            skills: ["System Design", "Data Structures"],
            tasks: [
              {
                name: "Mock Technical Interview Practice",
                type: "assessment",
                skill_name: "System Design",
                estimated_hours: 6,
                difficulty: "advanced",
                learning_objectives: ["Real-time problem solving", "Explaining architecture choices"],
                practice_tasks: ["Complete 2 mock peer interviews"],
                project_tasks: []
              }
            ]
          }
        ]
      };
    }

    // ==========================================
    // ROADMAP VERSIONING LOGIC
    // ==========================================
    // Archive old active roadmap
    if (activeRoadmap) {
      await supabase
        .from("roadmaps")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", activeRoadmap.id);
    }

    // Get previous version number
    const { data: versionCheck } = await supabase
      .from("roadmaps")
      .select("id")
      .eq("user_id", user.id);
    const versionNumber = (versionCheck?.length || 0) + 1;

    // Create new active roadmap
    const { data: newRoadmap, error: roadmapErr } = await supabase
      .from("roadmaps")
      .insert({
        user_id: user.id,
        target_career: profile?.target_career || "Software Engineer",
        current_readiness: profile?.placement_readiness || 0,
        ai_updated_at: new Date().toISOString(),
        ai_update_reason: `Adapted roadmap (v${versionNumber}) based on latest assessments and skill profile.`,
        status: "active"
      })
      .select()
      .single();

    if (roadmapErr || !newRoadmap) throw new Error(`Roadmap creation failed: ${roadmapErr?.message}`);

    // Insert new phases & tasks
    for (const phase of roadmapData.phases) {
      const { data: phaseRow, error: phaseErr } = await supabase
        .from("roadmap_phases")
        .insert({
          roadmap_id: newRoadmap.id,
          phase_number: phase.phase_number,
          title: phase.title,
          duration: phase.duration,
          status: phase.phase_number === 1 ? "active" : "pending",
          progress: 0,
          skills: phase.skills || [],
          ai_added: true,
          ai_reason: `Generated for gap closure in version ${versionNumber}`
        })
        .select()
        .single();

      if (phaseErr || !phaseRow) throw new Error(`Phase creation failed: ${phaseErr?.message}`);

      // Insert tasks for this phase
      const tasksToInsert = (phase.tasks || []).map((t: any) => {
        // Check if there is an identical completed task from previous version
        const completedMatch = completedTasksList.find(
          c => c.name.toLowerCase() === t.name.toLowerCase() && c.skill_name === t.skill_name
        );

        return {
          phase_id: phaseRow.id,
          roadmap_id: newRoadmap.id,
          name: t.name,
          type: t.type || "course",
          done: completedMatch ? true : false,
          status: completedMatch ? "completed" : "pending",
          completed_at: completedMatch ? completedMatch.completed_at : null,
          skill_name: t.skill_name
        };
      });

      if (tasksToInsert.length > 0) {
        const { error: tasksErr } = await supabase.from("roadmap_tasks").insert(tasksToInsert);
        if (tasksErr) throw tasksErr;
      }

      // Calculate initial progress for phase if any completed tasks were restored
      const totalPhaseTasks = tasksToInsert.length;
      const completedPhaseTasks = tasksToInsert.filter(t => t.done).length;
      const phaseProgress = totalPhaseTasks > 0 ? Math.round((completedPhaseTasks / totalPhaseTasks) * 100) : 0;
      
      await supabase
        .from("roadmap_phases")
        .update({ progress: phaseProgress })
        .eq("id", phaseRow.id);
    }

    // Log action to activity logs
    await supabase.from("activity_log").insert({
      user_id: user.id,
      type: "roadmap_generated",
      description: `AI adapted roadmap to version ${versionNumber}`
    });

    return jsonResponse({
      success: true,
      roadmap_id: newRoadmap.id,
      version: versionNumber,
      message: "Your roadmap has been updated based on your latest assessment."
    });

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
