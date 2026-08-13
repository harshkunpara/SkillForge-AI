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

    const { message, history } = await req.json();
    if (!message) throw new Error("message is required");

    // Fetch user context
    const [profileRes, skillsRes, gapsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_skills").select("skill_name,current_score,status").eq("user_id", user.id).limit(20),
      supabase.from("skill_gaps").select("skill_name,priority,gap").eq("user_id", user.id).order("gap", { ascending: false }).limit(5),
    ]);

    const profile = profileRes.data;
    const skills = skillsRes.data || [];
    const gaps = gapsRes.data || [];

    const systemPrompt = `You are SkillForge AI, a helpful career and learning assistant for college students.

Student context:
- Name: ${profile?.full_name || "Student"}
- Target Career: ${profile?.target_career || "Software Engineer"}
- Year: ${profile?.year || "3rd"}, ${profile?.degree || "B.Tech"} in ${profile?.branch || "CS"}
- Placement Readiness: ${profile?.placement_readiness || 0}%
- Top Skills: ${skills.slice(0, 5).map((s) => `${s.skill_name} (${s.current_score}%)`).join(", ")}
- Critical Skill Gaps: ${gaps.slice(0, 3).map((g) => `${g.skill_name} (gap: ${g.gap})`).join(", ")}

Be concise, encouraging, and specific to their profile. Use **bold** for key terms. Keep responses under 200 words unless asked for detail.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const messages = [
      ...(history || []).slice(-6).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    const reply = (response.content[0] as { text: string }).text;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
