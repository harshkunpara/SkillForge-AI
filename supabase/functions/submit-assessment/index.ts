import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { skill_name, questions, answers } = await req.json();

    if (!skill_name || !questions || !answers) {
      return new Response(JSON.stringify({ error: "skill_name, questions, and answers are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Server-side score calculation to prevent spoofing
    let correctCount = 0;
    const totalQuestions = questions.length;

    for (let i = 0; i < totalQuestions; i++) {
      const q = questions[i];
      const userAns = answers[i];
      const correctAns = q.correct_option ?? q.answer ?? q.correctAnswer;

      if (userAns !== undefined && String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase()) {
        correctCount++;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Get skill category
    const { data: skillRequirement } = await supabase
      .from("skill_requirements")
      .select("category")
      .eq("skill_name", skill_name)
      .limit(1)
      .maybeSingle();
    const category = skillRequirement?.category || "Development";

    // Insert into assessments table
    const { data: assessmentRow, error: insertErr } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        skill_name,
        questions,
        answers,
        score,
        verified_level: score >= 85 ? "advanced" : score >= 60 ? "intermediate" : "beginner"
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Update user_skills
    const { data: prevSkill } = await supabase
      .from("user_skills")
      .select("current_score")
      .eq("user_id", user.id)
      .eq("skill_name", skill_name)
      .maybeSingle();
    
    const prevScore = prevSkill?.current_score ?? 0;

    await supabase.from("user_skills").upsert({
      user_id: user.id,
      skill_name,
      category,
      verified_level: score >= 85 ? "advanced" : score >= 60 ? "intermediate" : "beginner",
      current_score: score,
      confidence: score,
      status: "verified",
      evidence: `Scored ${score}/100 on ${skill_name} diagnostic assessment`,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,skill_name" });

    // Create evidence record
    await supabase.from("evidence_records").insert({
      user_id: user.id,
      skill_name,
      source_type: "assessment",
      excerpt: `Scored ${score}/100 on ${skill_name} diagnostic assessment`,
      confidence: score
    });

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      type: "assessment_completed",
      description: `Completed ${skill_name} assessment — scored ${score}/100`,
      metadata: { score, skill_name }
    });

    // Log to system logs
    await supabase.rpc("log_system_event", {
      p_severity: "info",
      p_source: "submit-assessment",
      p_message: `User ${user.id} completed ${skill_name} assessment with score: ${score}`,
      p_details: { score, skill_name, request_id: requestId },
      p_event_name: "assessment_completed",
      p_request_id: requestId,
      p_user_id: user.id
    });

    // Trigger skill gap recalculation
    await supabase.rpc("recalculate_skill_gaps", { p_user_id: user.id });

    // Get current placement readiness before recalculating
    const { data: profileBefore } = await supabase
      .from("profiles")
      .select("placement_readiness")
      .eq("id", user.id)
      .single();
    
    const readinessBefore = profileBefore?.placement_readiness ?? 0;

    // Trigger readiness recalculation
    await supabase.rpc("calculate_readiness", { p_user_id: user.id });

    // Fetch updated profile readiness
    const { data: profileAfter } = await supabase
      .from("profiles")
      .select("placement_readiness")
      .eq("id", user.id)
      .single();

    const readinessAfter = profileAfter?.placement_readiness ?? 0;

    // Check if readiness changed by > 5 points, or if assessment score changed by > 10 points
    const readinessDiff = Math.abs(readinessAfter - readinessBefore);
    const scoreDiff = Math.abs(score - prevScore);
    let triggerRoadmap = false;

    if (readinessDiff > 5 || scoreDiff > 10) {
      triggerRoadmap = true;
      // Enqueue generate roadmap job
      await supabase.rpc("enqueue_background_job", {
        p_user_id: user.id,
        p_task_type: "recalculate_skills",
        p_payload: { reason: "assessment_change", skill_name, score }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        score,
        roadmap_adapting: triggerRoadmap,
        readiness_score: readinessAfter,
        request_id: requestId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
