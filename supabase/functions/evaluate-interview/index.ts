import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { questions, answers, mode, difficulty } = await req.json();
    if (!questions || !answers) throw new Error("questions and answers are required");

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const qaText = questions.map((q: string, i: number) =>
      `Q${i + 1}: ${q}\nAnswer: ${answers[i] || "(no answer)"}`
    ).join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a technical interviewer evaluating a student's interview responses.

Interview mode: ${mode || "mixed"}
Difficulty: ${difficulty || "medium"}

${qaText}

Evaluate and return a JSON object with this exact structure:
{
  "scores": [<score 0-100 for each answer, same order as questions>],
  "overall_score": <weighted average 0-100>,
  "question_feedback": [
    {
      "question": "<question text>",
      "score": <0-100>,
      "what_did_well": "<specific praise>",
      "what_missed": "<what was missing or wrong>",
      "model_answer_hint": "<brief hint at ideal answer>"
    }
  ],
  "weak_areas": ["<topic1>", "<topic2>"],
  "strengths": ["<strength1>", "<strength2>"],
  "overall_feedback": "<2-3 sentence summary>"
}

Be constructive and specific. Return ONLY valid JSON.`
      }]
    });

    const raw = (message.content[0] as { text: string }).text.trim();
    const evaluation = JSON.parse(raw);

    // Save interview session
    const { data: session } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        mode: mode || "mixed",
        difficulty: difficulty || "medium",
        questions,
        answers,
        scores: evaluation.scores,
        overall_score: evaluation.overall_score,
        weak_areas: evaluation.weak_areas || [],
        feedback: {
          question_feedback: evaluation.question_feedback,
          strengths: evaluation.strengths,
          overall_feedback: evaluation.overall_feedback,
        },
      })
      .select()
      .single();

    await supabase.from("activity_log").insert({
      user_id: user.id,
      type: "interview_completed",
      description: `Interview completed — score ${evaluation.overall_score}/100`,
    });

    // Update readiness score contribution from interview
    const { data: profile } = await supabase
      .from("profiles")
      .select("placement_readiness")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newReadiness = Math.round(
        (profile.placement_readiness || 50) * 0.85 + evaluation.overall_score * 0.15
      );
      await supabase.from("profiles").update({ placement_readiness: newReadiness }).eq("id", user.id);
    }

    return new Response(JSON.stringify({ ...evaluation, session_id: session?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
