import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Dashboard data ─────────────────────────────────────────────

export interface DashboardData {
  readiness: number;
  skills: { name: string; value: number; color: string }[];
  tasks: { id: string; name: string; type: string; done: boolean; phase_id: string }[];
  gaps: { skill: string; current: number; required: number; priority: string }[];
  activity: { type: string; description: string; created_at: string }[];
  roadmapPhases: { id: string; phase_number: number; title: string; status: string; progress: number; ai_added: boolean }[];
}

const SKILL_COLORS: Record<string, string> = {
  DSA: "#4f46e5", Development: "#7c3aed", "CS Fundamentals": "#2563eb",
  Projects: "#059669", Interview: "#d97706", Resume: "#10b981",
};

export function useDashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [gapsRes, activityRes, roadmapRes, tasksRes] = await Promise.all([
      supabase.from("skill_gaps").select("skill_name,current_score,required_score,gap,priority").eq("user_id", user.id).order("gap", { ascending: false }).limit(5),
      supabase.from("activity_log").select("type,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
      supabase.from("roadmaps").select("id").eq("user_id", user.id).single(),
      supabase.from("user_skills").select("skill_name,current_score,category").eq("user_id", user.id),
    ]);

    // Aggregate skill categories into the 6 dashboard dimensions
    const skillRows = tasksRes.data || [];
    const catScores: Record<string, number[]> = {};
    for (const s of skillRows) {
      const cat = s.category || "Other";
      if (!catScores[cat]) catScores[cat] = [];
      catScores[cat].push(s.current_score);
    }
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    // Map DB categories to dashboard display names
    const skillMap: { name: string; key: string; color: string }[] = [
      { name: "DSA", key: "DSA", color: "#4f46e5" },
      { name: "Development", key: "Development", color: "#7c3aed" },
      { name: "CS Fundamentals", key: "CS Fundamentals", color: "#2563eb" },
      { name: "Projects", key: "Projects", color: "#059669" },
      { name: "Interview", key: "Soft Skills", color: "#d97706" },
      { name: "Resume", key: "resume", color: "#10b981" },
    ];

    const skills = skillMap.map(({ name, key, color }) => {
      if (key === "resume") return { name, value: profile?.resume_score ?? 0, color };
      return { name, value: avg(catScores[key] || []), color };
    });

    // Fetch roadmap tasks
    let allTasks: DashboardData["tasks"] = [];
    if (roadmapRes.data?.id) {
      const phasesRes = await supabase
        .from("roadmap_phases")
        .select("id,phase_number,title,status,progress,ai_added")
        .eq("roadmap_id", roadmapRes.data.id)
        .order("phase_number");

      const phases = phasesRes.data || [];

      // Get active phase tasks
      const activePhase = phases.find((p) => p.status === "active");
      if (activePhase) {
        const tRes = await supabase
          .from("roadmap_tasks")
          .select("id,name,type,done,phase_id")
          .eq("phase_id", activePhase.id)
          .limit(6);
        allTasks = tRes.data || [];
      }

      setData({
        readiness: profile?.placement_readiness ?? 0,
        skills,
        tasks: allTasks,
        gaps: (gapsRes.data || []).map((g) => ({
          skill: g.skill_name, current: g.current_score, required: g.required_score, priority: g.priority,
        })),
        activity: activityRes.data || [],
        roadmapPhases: phases,
      });
    } else {
      setData({
        readiness: profile?.placement_readiness ?? 0,
        skills,
        tasks: [],
        gaps: (gapsRes.data || []).map((g) => ({
          skill: g.skill_name, current: g.current_score, required: g.required_score, priority: g.priority,
        })),
        activity: activityRes.data || [],
        roadmapPhases: [],
      });
    }

    setLoading(false);
  }, [user, profile]);

  useEffect(() => { load(); }, [load]);

  const completeTask = async (taskId: string, done: boolean) => {
    await supabase.from("roadmap_tasks").update({ done }).eq("id", taskId);
    if (done && user) {
      await supabase.from("activity_log").insert({ user_id: user.id, type: "task_completed", description: "Completed a roadmap task" });
    }
    setData((d) => d ? { ...d, tasks: d.tasks.map((t) => t.id === taskId ? { ...t, done } : t) } : d);
  };

  return { data, loading, reload: load, completeTask };
}

// ── Skill Gaps ─────────────────────────────────────────────────

export interface SkillGapRow {
  id: string; skill_name: string; current_score: number; required_score: number;
  gap: number; priority: string; reason: string | null; recommended_action: string | null;
}

export function useSkillGaps() {
  const { user } = useAuth();
  const [gaps, setGaps] = useState<SkillGapRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("skill_gaps")
      .select("*")
      .eq("user_id", user.id)
      .order("gap", { ascending: false });
    setGaps(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { gaps, loading, reload: load };
}

// ── Roadmap ─────────────────────────────────────────────────────

export interface RoadmapPhase {
  id: string; roadmap_id: string; phase_number: number; title: string; duration: string;
  status: string; progress: number; skills: string[]; ai_added: boolean; ai_reason: string | null;
  tasks: { id: string; name: string; type: string; done: boolean }[];
}

export function useRoadmap() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rm } = await supabase.from("roadmaps").select("id").eq("user_id", user.id).single();
    if (!rm) { setLoading(false); return; }
    setRoadmapId(rm.id);

    const { data: ps } = await supabase
      .from("roadmap_phases").select("*").eq("roadmap_id", rm.id).order("phase_number");

    const loaded: RoadmapPhase[] = [];
    for (const p of ps || []) {
      const { data: ts } = await supabase.from("roadmap_tasks").select("*").eq("phase_id", p.id);
      loaded.push({ ...p, tasks: ts || [] });
    }
    setPhases(loaded);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleTask = async (phaseId: string, taskId: string, done: boolean, userId: string) => {
    await supabase.from("roadmap_tasks").update({ done }).eq("id", taskId);
    if (done) await supabase.from("activity_log").insert({ user_id: userId, type: "task_completed", description: "Completed a roadmap task" });

    setPhases((prev) => prev.map((p) => {
      if (p.id !== phaseId) return p;
      const newTasks = p.tasks.map((t) => t.id === taskId ? { ...t, done } : t);
      const pct = Math.round((newTasks.filter((t) => t.done).length / newTasks.length) * 100);
      supabase.from("roadmap_phases").update({ progress: pct }).eq("id", phaseId);
      return { ...p, tasks: newTasks, progress: pct };
    }));
  };

  return { phases, roadmapId, loading, reload: load, toggleTask };
}

// ── User Skills ─────────────────────────────────────────────────

export interface UserSkill {
  id: string; skill_name: string; category: string; resume_level: string | null;
  verified_level: string | null; current_score: number; confidence: number | null;
  evidence: string | null; status: string;
}

export function useUserSkills() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("user_skills").select("*").eq("user_id", user.id).order("current_score", { ascending: false });
    setSkills(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { skills, loading, reload: load };
}

// ── Interview History ──────────────────────────────────────────

export function useInterviewHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<{ overall_score: number; created_at: string; weak_areas: string[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("interview_sessions").select("overall_score,created_at,weak_areas")
      .eq("user_id", user.id).order("created_at").then(({ data }) => {
        setSessions(data || []);
        setLoading(false);
      });
  }, [user]);

  return { sessions, loading };
}

// ── Analytics History ──────────────────────────────────────────

export function useAnalytics() {
  const { user } = useAuth();
  const [readinessHistory, setReadinessHistory] = useState<{ score: number; recorded_at: string }[]>([]);
  const [activity, setActivity] = useState<{ type: string; description: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("readiness_history").select("score,recorded_at").eq("user_id", user.id).order("recorded_at"),
      supabase.from("activity_log").select("type,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]).then(([rh, al]) => {
      setReadinessHistory(rh.data || []);
      setActivity(al.data || []);
      setLoading(false);
    });
  }, [user]);

  return { readinessHistory, activity, loading };
}

// ── Readiness Breakdown (explainable score) ──────────────────────

export interface ReadinessBreakdownRow {
  score: number | null;
  readiness_status: "complete" | "incomplete" | null;
  skill_match_component: number | null;
  resume_quality_component: number | null;
  assessment_component: number | null;
  interview_component: number | null;
  missing_inputs: string[] | null;
  recorded_at: string;
}

export function useReadinessBreakdown() {
  const { user } = useAuth();
  const [breakdown, setBreakdown] = useState<ReadinessBreakdownRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("readiness_history")
      .select(
        "score,readiness_status,skill_match_component,resume_quality_component,assessment_component,interview_component,missing_inputs,recorded_at"
      )
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle<ReadinessBreakdownRow>();

    if (fetchError) {
      setError("Could not load readiness breakdown.");
    } else {
      setBreakdown(data ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { breakdown, loading, error, reload: load };
}
