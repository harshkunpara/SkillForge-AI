import { useNavigate } from "react-router";
import { Sparkles, ArrowRight, CheckCircle, Clock, Zap, AlertTriangle, BookOpen, RefreshCw } from "lucide-react";
import { useDashboard } from "../hooks/useSupabaseData";
import { useAuth } from "../context/AuthContext";

function CircularProgress({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e0e7ff" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#dashGrad)" strokeWidth={strokeWidth}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="progress-ring-circle" />
      <defs>
        <linearGradient id="dashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  task_completed: "✅",
  interview_completed: "🎤",
  gaps_calculated: "📊",
  resume_analyzed: "📄",
  roadmap_generated: "🗺️",
};

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m < 2 ? "just now" : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data, loading, reload, completeTask } = useDashboard();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-slate-500 text-sm">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const readiness = data?.readiness ?? 0;
  const skills = data?.skills ?? [];
  const tasks = data?.tasks ?? [];
  const gaps = data?.gaps ?? [];
  const activity = data?.activity ?? [];
  const phases = data?.roadmapPhases ?? [];

  const doneTasks = tasks.filter((t) => t.done).length;
  const topGap = gaps[0];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{greeting}, {firstName} 👋</h1>
          <p className="text-slate-500 mt-1">
            {readiness === 0
              ? "Upload your resume or take a skill assessment to get started."
              : "Here's what you should focus on today."}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-secondary text-sm px-3 py-2">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => navigate("/resume")} className="btn-secondary text-sm px-4 py-2">
            <Sparkles size={14} className="text-indigo-500" /> AI Analyze Resume
          </button>
          <button onClick={() => navigate("/roadmap")} className="btn-primary text-sm px-4 py-2">
            View Roadmap <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Placement Readiness */}
        <div className="col-span-12 lg:col-span-4">
          <div className="card p-6 h-full">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Placement Readiness</div>
              {readiness > 0 && <span className="badge-green">Live</span>}
            </div>

            <div className="flex flex-col items-center py-4">
              {readiness === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-3">🎯</div>
                  <div className="text-sm text-slate-500">No data yet</div>
                  <div className="text-xs text-slate-400 mt-1">Complete your resume or skill assessment</div>
                </div>
              ) : (
                <div className="relative">
                  <CircularProgress value={readiness} size={140} strokeWidth={12} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-900">{readiness}%</span>
                    <span className="text-xs text-slate-400 font-medium">Job Ready</span>
                  </div>
                </div>
              )}
            </div>

            {skills.length > 0 ? (
              <div className="space-y-3 mt-2">
                {skills.map(({ name, value, color }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">{name}</span>
                      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
                    </div>
                    <div className="skill-bar-track">
                      <div className="skill-bar-fill" style={{ width: `${value}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-center text-xs text-slate-400">
                Skill scores appear after resume analysis or assessments.
              </div>
            )}

            {readiness > 0 && (
              <div className="mt-4 rounded-lg p-3 text-center" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                <div className="text-xs text-indigo-700 font-medium">
                  {readiness < 50 ? "Keep learning — you're making progress!" :
                   readiness < 75 ? "You're past the halfway mark — great work!" :
                   "Strong readiness! Polish your weakest skills."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {/* Today's Tasks */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="ai-tag"><Sparkles size={9} /> AI Plan</span>
              <h3 className="font-bold text-slate-900">Today's Focus</h3>
              <span className="text-xs text-slate-400 ml-auto">{doneTasks}/{tasks.length} done</span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🗺️</div>
                <div className="text-sm text-slate-600 font-medium mb-1">No roadmap tasks yet</div>
                <div className="text-xs text-slate-400 mb-4">Generate your personalized roadmap to see daily tasks here.</div>
                <button onClick={() => navigate("/roadmap")} className="btn-primary text-xs px-4 py-2">
                  Generate Roadmap <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${t.done ? "bg-emerald-50 border-emerald-200" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}
                    onClick={() => completeTask(t.id, !t.done)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                      {t.done && <CheckCircle size={12} className="text-white" fill="white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${t.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{t.name}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400 capitalize">{t.type}</span>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-indigo-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skill Gaps + Recommended Next */}
          <div className="grid grid-cols-2 gap-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-red-500" />
                <h3 className="font-bold text-slate-900 text-sm">Top Skill Gaps</h3>
              </div>
              {gaps.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">✨</div>
                  <div className="text-xs text-slate-500">No gaps calculated yet</div>
                  <button onClick={() => navigate("/skill-gap")} className="text-xs text-indigo-600 font-semibold mt-3 flex items-center gap-1 mx-auto">
                    Analyze Gaps <ArrowRight size={11} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {gaps.slice(0, 3).map(({ skill, current, required, priority }) => (
                    <div key={skill}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{skill}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority === "critical" ? "bg-red-100 text-red-600" : priority === "high" ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-600"}`}>
                          {priority}
                        </span>
                      </div>
                      <div className="skill-bar-track">
                        <div className="skill-bar-fill bg-red-400" style={{ width: `${current}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>Current: {current}%</span>
                        <span>Required: {required}%</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => navigate("/skill-gap")} className="mt-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
                    View Full Analysis <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>

            <div className="card p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} className="text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Recommended Next</h3>
              </div>
              <div className="flex-1 rounded-xl p-4" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                <div className="ai-tag mb-3"><Sparkles size={9} /> AI Pick</div>
                {topGap ? (
                  <>
                    <div className="font-bold text-slate-900 mb-2">Close your {topGap.skill} gap</div>
                    <div className="text-xs text-slate-600 leading-relaxed mb-3">
                      {topGap.skill} is your #{1} skill gap ({topGap.current}% vs {topGap.required}% required). Addressing it now will boost your readiness the most.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-slate-900 mb-2">Analyze your resume</div>
                    <div className="text-xs text-slate-600 leading-relaxed mb-3">
                      Upload your resume to get AI-powered skill detection, gap analysis, and a personalized roadmap.
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={10} /> 20 min</span>
                </div>
              </div>
              <button onClick={() => navigate(topGap ? "/skill-gap" : "/resume")} className="btn-primary text-xs px-4 py-2 mt-3 justify-center">
                {topGap ? "Start Assessment" : "Upload Resume"} <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Current Roadmap */}
          {phases.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Current Roadmap</h3>
                <button onClick={() => navigate("/roadmap")} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
                  Full View <ArrowRight size={11} />
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {phases.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                        p.status === "completed" ? "bg-emerald-500 text-white" :
                        p.status === "active" ? "text-white" :
                        p.ai_added ? "bg-amber-100 text-amber-700 border-2 border-amber-400 border-dashed" :
                        "bg-slate-100 text-slate-400"
                      }`} style={p.status === "active" ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}>
                        {p.status === "completed" ? "✓" : p.phase_number}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 text-center max-w-16">{p.title}</div>
                      {p.ai_added && <div className="text-[8px] text-amber-600 font-bold">AI Added</div>}
                    </div>
                    {i < phases.length - 1 && (
                      <div className={`w-8 h-0.5 flex-shrink-0 ${p.status === "completed" ? "bg-emerald-300" : "bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={15} className="text-slate-500" />
              <h3 className="font-bold text-slate-900">Recent Activity</h3>
            </div>
            {activity.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">No activity yet — complete tasks to see your history here.</div>
            ) : (
              <div className="space-y-3">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                      {ACTIVITY_ICONS[a.type] || "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{a.description}</div>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
