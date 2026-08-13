import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Enforce Admin role restriction
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Access denied. Admins only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, search = "", page = 1, limit = 20, target_user_id } = await req.json().catch(() => ({}));

    // ==========================================
    // ACTION: GET ADMIN METRICS
    // ==========================================
    if (action === "get-metrics") {
      const [usersCount, activeCount, readinessAvg, assessmentsCount, interviewsCount] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.rpc("get_average_readiness"), // Fallback to raw averaging if RPC is absent
        supabase.from("assessments").select("id", { count: "exact", head: true }),
        supabase.from("interview_sessions").select("id", { count: "exact", head: true })
      ]);

      // Calculate career distribution
      const { data: distribution } = await supabase
        .from("profiles")
        .select("target_career");
      
      const distributionMap: Record<string, number> = {};
      (distribution || []).forEach(p => {
        if (p.target_career) {
          distributionMap[p.target_career] = (distributionMap[p.target_career] || 0) + 1;
        }
      });

      // Log admin audit action
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "view_metrics",
        details: { request_id: requestId }
      });

      return new Response(
        JSON.stringify({
          metrics: {
            total_users: usersCount.count || 0,
            active_users_7d: activeCount.count || 0,
            career_distribution: distributionMap,
            avg_readiness: readinessAvg.data || 0,
            total_assessments: assessmentsCount.count || 0,
            total_interviews: interviewsCount.count || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: GET ADMIN USERS (SEARCH & LIST)
    // ==========================================
    if (action === "get-users") {
      let query = supabase
        .from("profiles")
        .select("id, full_name, college, target_career, placement_readiness, updated_at");

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,college.ilike.%${search}%,target_career.ilike.%${search}%`);
      }

      const offset = (page - 1) * limit;
      const { data: usersList, error: listErr } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (listErr) throw listErr;

      return new Response(JSON.stringify({ users: usersList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // ACTION: GET SAFE USER DETAILS (NO RESUME EXPOSURE)
    // ==========================================
    if (action === "get-user-detail") {
      if (!target_user_id) throw new Error("target_user_id is required");

      const [targetProfile, targetSkills] = await Promise.all([
        supabase.from("profiles").select("id, full_name, college, degree, year, branch, target_career, placement_readiness, onboarding_complete").eq("id", target_user_id).single(),
        supabase.from("user_skills").select("skill_name, current_score, category, status").eq("user_id", target_user_id)
      ]);

      // Log admin audit action
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "view_user_detail",
        target_user_id,
        details: { request_id: requestId }
      });

      return new Response(
        JSON.stringify({
          profile: targetProfile.data,
          skills: targetSkills.data || []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action specified");

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
