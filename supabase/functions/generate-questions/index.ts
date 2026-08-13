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

    const { mode, difficulty, count = 5 } = await req.json();

    const [profileRes, skillsRes, gapsRes] = await Promise.all([
      supabase.from("profiles").select("target_career,experience_level,branch").eq("id", user.id).single(),
      supabase.from("user_skills").select("skill_name,current_score").eq("user_id", user.id).order("current_score", { ascending: true }).limit(10),
      supabase.from("skill_gaps").select("skill_name,priority").eq("user_id", user.id).order("gap", { ascending: false }).limit(5),
    ]);

    const profile = profileRes.data;
    const skills = skillsRes.data || [];
    const gaps = gapsRes.data || [];

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const prompt = `Generate ${count} ${difficulty || "medium"} ${mode || "technical"} interview questions for a student.

Target Role: ${profile?.target_career || "Software Engineer"}
Background: ${profile?.branch || "Computer Science"}
Experience: ${profile?.experience_level || "beginner"}

Weak skills (low scores): ${skills.slice(0, 5).map((s) => s.skill_name).join(", ")}
Critical gaps: ${gaps.map((g) => g.skill_name).join(", ")}

Interview mode: ${mode}
- technical: algorithms, data structures, system design
- DSA: data structures and algorithms specifically
- behavioral: situational, teamwork, leadership
- HR: company fit, salary, goals
- project: questions about their specific projects

Return a JSON array of exactly ${count} strings (just the question text):
["question1", "question2", ...]

Make questions specific to their weak areas and target role. Return ONLY valid JSON array.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { text: string }).text.trim();
    const questions = JSON.parse(raw);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
