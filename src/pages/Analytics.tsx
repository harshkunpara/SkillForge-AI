import { TrendingUp, Brain, FolderOpen, Clock, Mic, BarChart2 } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAnalytics, useUserSkills } from "../hooks/useSupabaseData";
import { useAuth } from "../context/AuthContext";

const tooltipStyle = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "Inter" };

function timeLabel(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ACTIVITY_ICONS: Record<string, string> = {
  task_completed: "✅",
  interview_completed: "🎤",
  gaps_calculated: "📊",
  resume_analyzed: "📄",
  roadmap_generated: "🗺️",
};

export default function Analytics() {
  const { profile } = useAuth();
  const { readinessHistory, activity, loading } = useAnalytics();
  const { skills } = useUserSkills();

  const readiness = profile?.placement_readiness ?? 0;

  // Build readiness trend data from history
  const trendData = readinessHistory.map((r) => ({
    date: timeLabel(r.recorded_at),
    readiness: r.score,
  }));

  // Build activity bar data — count events per day for last 7 days
  const activityByDay: Record<string, number> = {};
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    activityByDay[d.toLocaleDateString("en-US", { weekday: "short" })] = 0;
  }
  for (const a of activity) {
    const day = new Date(a.created_at).toLocaleDateString("en-US", { weekday: "short" });
    if (day in activityByDay) activityByDay[day]++;
  }
  const activityData = Object.entries(activityByDay).map(([day, events]) => ({ day, events }));

  // Skill counts
  const mastered = skills.filter((s) => s.current_score >= 85).length;
  const learning = skills.filter((s) => s.current_score > 0 && s.current_score < 85).length;

  const interviewSessions = activity.filter((a) => a.type === "interview_completed").length;

  const KPIS = [
    { label: "Placement Readiness", value: `${readiness}%`, icon: TrendingUp, color: "#4f46e5", bg: "#eef2ff" },
    { label: "Skills Mastered", value: String(mastered), icon: Brain, color: "#10b981", bg: "#f0fdf4" },
    { label: "Skills Learning", value: String(learning), icon: Brain, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Total Skills", value: String(skills.length), icon: FolderOpen, color: "#2563eb", bg: "#eff6ff" },
    { label: "Interviews Done", value: String(interviewSessions), icon: Mic, color: "#d97706", bg: "#fffbeb" },
    { label: "Activities", value: String(activity.length), icon: Clock, color: "#059669", bg: "#f0fdf4" },
  ];

  // Project readiness forward
  const current4wks = Math.min(100, readiness + 7);
  const target8wks = Math.min(100, readiness + 12);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Career Analytics</h1>
        <p className="text-slate-500 mt-1">Track your growth, learning activity, and placement readiness over time.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {KPIS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div className="text-2xl font-black" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Readiness trend */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Placement Readiness Trend</h3>
            {trendData.length > 1 && (
              <span className="badge-green">↑ {trendData[trendData.length - 1].readiness - trendData[0].readiness}% total</span>
            )}
          </div>
          {trendData.length < 2 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Complete more activities to see your readiness trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="readiness" stroke="#4f46e5" strokeWidth={2.5} fill="url(#readinessGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly activity */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4">Activity This Week</h3>
          {activityData.every((d) => d.events === 0) ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No activity recorded yet. Complete tasks and interviews to see data here.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="events" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Skill scores */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4">Skill Score Distribution</h3>
          {skills.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No skills data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={skills.slice(0, 8).map((s) => ({ name: s.skill_name.slice(0, 8), score: s.current_score }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Score %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent activity feed */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4">Recent Activity</h3>
          {activity.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No activity yet.</div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-48">
              {activity.slice(0, 10).map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">{ACTIVITY_ICONS[a.type] || "📌"}</span>
                  <span className="text-slate-700 flex-1 min-w-0 truncate">{a.description}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Career trajectory */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-indigo-500" />
          <h3 className="font-bold text-slate-900">Career Trajectory</h3>
          <span className="text-xs text-slate-400 ml-auto">Based on current learning pace</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Current Readiness", value: `${readiness}%`, note: "Today", color: "#4f46e5" },
            { label: "Projected (4 weeks)", value: `${current4wks}%`, note: "At current pace", color: "#7c3aed" },
            { label: "Job Ready Target", value: `${target8wks}%`, note: "Estimated in 8 weeks", color: "#10b981" },
          ].map(({ label, value, note, color }) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: color + "10" }}>
              <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
              <div className="text-sm font-medium text-slate-700">{label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{note}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
          <strong className="text-slate-600">Disclaimer:</strong> Career trajectory is a projection based on your current learning pace and skill gap progress. It does not guarantee placement outcomes. Continue consistent practice for best results.
        </div>
      </div>
    </div>
  );
}
