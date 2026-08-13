import { useState } from "react";
import { CheckCircle, AlertTriangle, Zap, Brain, Search } from "lucide-react";
import { useUserSkills } from "../hooks/useSupabaseData";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  mastered: { label: "Mastered", color: "#16a34a", bg: "#f0fdf4", icon: <CheckCircle size={12} /> },
  verified: { label: "Verified", color: "#2563eb", bg: "#eff6ff", icon: <CheckCircle size={12} /> },
  "needs-improvement": { label: "Needs Work", color: "#b45309", bg: "#fffbeb", icon: <AlertTriangle size={12} /> },
  unverified: { label: "Not Verified", color: "#6b7280", bg: "#f3f4f6", icon: <Zap size={12} /> },
  learning: { label: "Learning", color: "#7c3aed", bg: "#f5f3ff", icon: <Brain size={12} /> },
};

function scoreToStatus(score: number): string {
  if (score >= 85) return "mastered";
  if (score >= 70) return "verified";
  if (score >= 40) return "needs-improvement";
  if (score > 0) return "unverified";
  return "unverified";
}

export default function MySkills() {
  const { skills, loading } = useUserSkills();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const categories = ["All", ...Array.from(new Set(skills.map((s) => s.category).filter(Boolean)))];

  const filtered = skills.filter((s) =>
    (category === "All" || s.category === category) &&
    s.skill_name.toLowerCase().includes(search.toLowerCase())
  );

  const mastered = skills.filter((s) => s.current_score >= 85).length;
  const verified = skills.filter((s) => s.current_score >= 70 && s.current_score < 85).length;
  const needsWork = skills.filter((s) => s.current_score > 0 && s.current_score < 70).length;
  const unverified = skills.filter((s) => s.current_score === 0).length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Skills</h1>
          <p className="text-slate-500 mt-1">Skills detected from your resume and assessments. Verified skills update your roadmap automatically.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Mastered", count: mastered, color: "#10b981" },
          { label: "Verified", count: verified, color: "#3b82f6" },
          { label: "Needs Work", count: needsWork, color: "#f59e0b" },
          { label: "Not Verified", count: unverified, color: "#6b7280" },
        ].map(({ label, count, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-3xl font-black mb-1" style={{ color }}>{count}</div>
            <div className="text-xs text-slate-500 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-400 transition-colors" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${category === c ? "text-white border-indigo-500" : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"}`}
              style={category === c ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <div className="font-bold text-slate-900 text-lg mb-2">No skills yet</div>
          <div className="text-slate-500 text-sm mb-4">Upload your resume to automatically detect and score your skills.</div>
          <a href="/resume" className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">Go to Resume Analyzer</a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">No skills match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => {
            const status = s.status && statusConfig[s.status] ? s.status : scoreToStatus(s.current_score);
            const sc = statusConfig[status] || statusConfig["unverified"];
            const confidence = s.confidence ?? s.current_score;

            return (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-900">{s.skill_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.category}</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.color }}>
                    {sc.icon} {sc.label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-xs">
                    <div className="text-slate-400 mb-0.5">Resume Level</div>
                    <div className="font-semibold text-slate-700">{s.resume_level ?? "Not listed"}</div>
                  </div>
                  <div className="text-xs">
                    <div className="text-slate-400 mb-0.5">Verified Level</div>
                    <div className="font-semibold text-slate-700">{s.verified_level ?? "Not verified"}</div>
                  </div>
                </div>

                {confidence > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Score</span><span>{confidence}%</span>
                    </div>
                    <div className="skill-bar-track">
                      <div className="skill-bar-fill" style={{
                        width: `${confidence}%`,
                        background: confidence >= 85 ? "#10b981" : confidence >= 70 ? "#3b82f6" : "#f59e0b"
                      }} />
                    </div>
                  </div>
                )}

                {s.evidence && (
                  <div className="text-xs text-slate-400 italic leading-relaxed">{s.evidence}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
