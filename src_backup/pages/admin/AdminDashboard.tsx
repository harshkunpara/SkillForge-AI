import { useEffect, useState } from "react";
import { Users, FileText, Brain, Mic, Map, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "../../lib/supabase";

const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "Inter" };

const CAREER_COLORS = ["#4f46e5", "#7c3aed", "#2563eb", "#059669", "#d97706", "#94a3b8"];

interface Kpi {
  label: string;
  value: number;
  icon: typeof Users;
  color: string;
  bg: string;
}

interface CareerSlice {
  name: string;
  value: number;
  color: string;
}

interface SkillGapRow {
  skill: string;
  gap: number;
}

interface ReadinessPoint {
  label: string;
  score: number;
}

interface ActivityRow {
  id: string;
  description: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [careers, setCareers] = useState<CareerSlice[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGapRow[]>([]);
  const [readinessTrend, setReadinessTrend] = useState<ReadinessPoint[]>([]);
  const [avgResumeScore, setAvgResumeScore] = useState<number | null>(null);
  const [avgInterviewScore, setAvgInterviewScore] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const [
          profilesCountRes,
          activeProfilesCountRes,
          resumeAnalysesCountRes,
          assessmentsCountRes,
          interviewsCountRes,
          roadmapsCountRes,
          careerRes,
          skillGapRes,
          readinessRes,
          resumeScoreRes,
          interviewScoreRes,
          activityRes,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_complete", true),
          supabase.from("resume_analyses").select("id", { count: "exact", head: true }),
          supabase.from("assessments").select("id", { count: "exact", head: true }),
          supabase.from("interview_sessions").select("id", { count: "exact", head: true }),
          supabase.from("roadmaps").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("target_career").not("target_career", "is", null),
          supabase.from("skill_gaps").select("skill_name"),
          supabase
            .from("readiness_history")
            .select("score, recorded_at")
            .order("recorded_at", { ascending: true })
            .limit(200),
          supabase.from("resume_analyses").select("score"),
          supabase.from("interview_sessions").select("overall_score"),
          supabase
            .from("activity_log")
            .select("id, description, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        if (cancelled) return;

        const firstError =
          profilesCountRes.error ||
          activeProfilesCountRes.error ||
          resumeAnalysesCountRes.error ||
          assessmentsCountRes.error ||
          interviewsCountRes.error ||
          roadmapsCountRes.error ||
          careerRes.error ||
          skillGapRes.error ||
          readinessRes.error ||
          resumeScoreRes.error ||
          interviewScoreRes.error ||
          activityRes.error;

        if (firstError) throw firstError;

        setKpis([
          { label: "Total Students", value: profilesCountRes.count ?? 0, icon: Users, color: "#4f46e5", bg: "#eef2ff" },
          { label: "Onboarded Students", value: activeProfilesCountRes.count ?? 0, icon: TrendingUp, color: "#10b981", bg: "#f0fdf4" },
          { label: "Resumes Analyzed", value: resumeAnalysesCountRes.count ?? 0, icon: FileText, color: "#7c3aed", bg: "#f5f3ff" },
          { label: "AI Assessments", value: assessmentsCountRes.count ?? 0, icon: Brain, color: "#2563eb", bg: "#eff6ff" },
          { label: "Interview Sessions", value: interviewsCountRes.count ?? 0, icon: Mic, color: "#d97706", bg: "#fffbeb" },
          { label: "Roadmaps Generated", value: roadmapsCountRes.count ?? 0, icon: Map, color: "#059669", bg: "#f0fdf4" },
        ]);

        // Career distribution — group client-side (no RPC available)
        const careerCounts = new Map<string, number>();
        for (const row of careerRes.data ?? []) {
          const key = row.target_career ?? "Unspecified";
          careerCounts.set(key, (careerCounts.get(key) ?? 0) + 1);
        }
        const careerSlices = Array.from(careerCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value], i) => ({ name, value, color: CAREER_COLORS[i % CAREER_COLORS.length] }));
        setCareers(careerSlices);

        // Skill gaps — group client-side, top 5 by count
        const gapCounts = new Map<string, number>();
        for (const row of skillGapRes.data ?? []) {
          gapCounts.set(row.skill_name, (gapCounts.get(row.skill_name) ?? 0) + 1);
        }
        const topGaps = Array.from(gapCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([skill, gap]) => ({ skill, gap }));
        setSkillGaps(topGaps);

        // Readiness trend — bucket by month client-side
        const monthBuckets = new Map<string, { sum: number; count: number }>();
        for (const row of readinessRes.data ?? []) {
          if (row.score === null || !row.recorded_at) continue;
          const d = new Date(row.recorded_at);
          const key = d.toLocaleDateString("en-US", { month: "short" });
          const bucket = monthBuckets.get(key) ?? { sum: 0, count: 0 };
          bucket.sum += row.score;
          bucket.count += 1;
          monthBuckets.set(key, bucket);
        }
        setReadinessTrend(
          Array.from(monthBuckets.entries()).map(([label, { sum, count }]) => ({
            label,
            score: Math.round(sum / count),
          }))
        );

        // Average resume score
        const resumeScores = (resumeScoreRes.data ?? []).map((r) => r.score).filter((s): s is number => s !== null);
        setAvgResumeScore(resumeScores.length ? Math.round(resumeScores.reduce((a, b) => a + b, 0) / resumeScores.length) : null);

        // Average interview score
        const interviewScores = (interviewScoreRes.data ?? [])
          .map((r) => r.overall_score)
          .filter((s): s is number => s !== null);
        setAvgInterviewScore(
          interviewScores.length ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length) : null
        );

        setRecentActivity(activityRes.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Could not load dashboard data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading platform data…
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load dashboard data: {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 mt-0.5">Live counts from the platform database.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="admin-card">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-2xl font-black text-gray-900">{value.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Readiness trend */}
        <div className="lg:col-span-2 admin-card">
          <h3 className="font-bold text-gray-900 mb-4">Average Readiness Over Time</h3>
          {readinessTrend.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              Not enough readiness history yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={readinessTrend}>
                <defs>
                  <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2.5} fill="url(#readinessGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Career distribution */}
        <div className="admin-card">
          <h3 className="font-bold text-gray-900 mb-4">Target Careers</h3>
          {careers.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">No data yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={careers} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {careers.map(({ color }, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {careers.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-gray-600">{name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Most common skill gaps */}
        <div className="admin-card">
          <h3 className="font-bold text-gray-900 mb-1">Most Common Skill Gaps</h3>
          <p className="text-xs text-gray-400 mb-4">Number of open skill_gaps rows per skill</p>
          {skillGaps.length === 0 ? (
            <div className="text-sm text-gray-400">No open skill gaps recorded.</div>
          ) : (
            <div className="space-y-3">
              {skillGaps.map(({ skill, gap }, i) => (
                <div key={skill}>
                  <div className="flex justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold bg-red-100 text-red-600">{i + 1}</span>
                      <span className="font-medium text-gray-700">{skill}</span>
                    </div>
                    <span className="text-gray-500">{gap.toLocaleString()} students</span>
                  </div>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill bg-red-400" style={{ width: `${(gap / skillGaps[0].gap) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bar: avg scores */}
        <div className="admin-card">
          <h3 className="font-bold text-gray-900 mb-4">Average Scores</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={[
                { label: "Resume", value: avgResumeScore ?? 0 },
                { label: "Interview", value: avgInterviewScore ?? 0 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary card */}
        <div className="admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-indigo-500" />
            <h3 className="font-bold text-gray-900">Score Summary</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Resume Score</span>
              <span className="text-lg font-black text-indigo-600">{avgResumeScore !== null ? `${avgResumeScore}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Interview Score</span>
              <span className="text-lg font-black text-amber-600">{avgInterviewScore !== null ? `${avgInterviewScore}` : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="admin-card">
        <h3 className="font-bold text-gray-900 mb-4">Recent Platform Activity</h3>
        {recentActivity.length === 0 ? (
          <div className="text-sm text-gray-400">No recent activity recorded.</div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map(({ id, description, created_at }) => (
              <div key={id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700">{description}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
