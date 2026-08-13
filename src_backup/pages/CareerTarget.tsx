import { useState } from "react";
import { Target, CheckCircle, Sparkles, ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { callEdgeFunction } from "../lib/supabase";

const CAREER_ROLES = [
  { title: "Software Engineer", skills: ["DSA", "Java", "SQL", "OOP", "Git", "System Design"], icon: "💻" },
  { title: "Full Stack Developer", skills: ["React", "Node.js", "MongoDB", "CSS", "REST APIs"], icon: "🌐" },
  { title: "AI/ML Engineer", skills: ["Python", "ML Algorithms", "PyTorch", "Statistics", "Data Processing"], icon: "🤖" },
  { title: "Data Analyst", skills: ["SQL", "Python", "Excel", "Tableau", "Statistics"], icon: "📊" },
  { title: "Data Scientist", skills: ["Python", "ML", "Statistics", "R", "Data Visualization"], icon: "🔬" },
  { title: "Cloud Engineer", skills: ["AWS", "Docker", "Kubernetes", "Linux", "Networking"], icon: "☁️" },
];

const SAMPLE_JD = `Software Engineer — Backend

We are looking for a skilled Software Engineer to join our backend team.

Requirements:
- Strong DSA skills with experience in competitive programming
- Proficiency in Java or C++ (2+ years)
- SQL and database design experience
- OOP principles and design patterns
- Experience with Git and version control
- Basic understanding of system design concepts

Nice to have:
- Spring Boot or similar frameworks
- Experience with microservices architecture
- AWS or GCP cloud experience`;

interface JDResult {
  match_score: number;
  skills_required: { skill: string; required: number; current: number }[];
  insight: string;
  top_gap: string | null;
}

export default function CareerTarget() {
  const { profile, updateProfile } = useAuth();
  const [selected, setSelected] = useState(profile?.target_career || "Software Engineer");
  const [jd, setJd] = useState("");
  const [jdResult, setJdResult] = useState<JDResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTarget = async (title: string) => {
    if (title === profile?.target_career) return;
    setSelected(title);
    setSaving(true);
    try {
      await updateProfile({ target_career: title });
      // Recalculate gaps, readiness, and roadmap for the new target
      callEdgeFunction("calculate-gaps", { target_career: title }).catch(() => null);
      callEdgeFunction("generate-roadmap", { target_career: title }).catch(() => null);
    } finally {
      setSaving(false);
    }
  };

  const analyzeJD = async () => {
    if (!jd.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await callEdgeFunction<JDResult>("analyze-jd", { jd_text: jd, current_career: selected });
      setJdResult(result);
    } catch {
      setError("Couldn't analyze this job description right now. Please try again in a moment.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Career Goal</h1>
        <p className="text-slate-500 mt-1">Choose your target role or paste a job description for precise skill gap analysis.</p>
      </div>

      {/* Current target */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-indigo-50">
          {CAREER_ROLES.find((r) => r.title === selected)?.icon || "💼"}
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500 font-medium">Current Target</div>
          <div className="font-bold text-slate-900">{selected}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Placement Readiness</div>
          <div className="text-xl font-black text-indigo-600">{profile?.placement_readiness ?? 0}%</div>
        </div>
        {saving && <Loader2 size={16} className="animate-spin text-indigo-500" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role cards */}
        <div>
          <h2 className="font-bold text-slate-900 mb-4">Select Your Target Role</h2>
          <div className="space-y-3">
            {CAREER_ROLES.map(({ title, skills, icon }) => (
              <div
                key={title}
                onClick={() => saveTarget(title)}
                className={`card p-4 cursor-pointer transition-all ${selected === title ? "ring-2 ring-indigo-500 bg-indigo-50/30" : "hover:shadow-md"}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {title}
                      {selected === title && <CheckCircle size={14} className="text-indigo-600" />}
                    </div>
                    <div className="text-xs text-slate-400">{skills.slice(0, 3).join(", ")}...</div>
                  </div>
                  {selected === title && profile?.placement_readiness != null && (
                    <div className="text-right">
                      <div className={`text-lg font-black ${profile.placement_readiness >= 70 ? "text-emerald-600" : profile.placement_readiness >= 50 ? "text-amber-600" : "text-red-500"}`}>
                        {profile.placement_readiness}%
                      </div>
                      <div className="text-[10px] text-slate-400">readiness</div>
                    </div>
                  )}
                </div>
                <div className="skill-bar-track">
                  <div className="skill-bar-fill" style={{
                    width: selected === title ? `${profile?.placement_readiness ?? 50}%` : "50%",
                    background: "#4f46e5",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* JD Analyzer */}
        <div>
          <h2 className="font-bold text-slate-900 mb-4">Analyze a Job Description</h2>
          {!jdResult ? (
            <div className="card p-5">
              {error && <div className="text-sm text-red-500 mb-3 p-3 rounded-lg bg-red-50">{error}</div>}
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder={SAMPLE_JD}
                rows={12}
                className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-indigo-400 resize-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => setJd(SAMPLE_JD)} className="text-xs text-slate-400 hover:text-slate-600 underline">Load sample JD</button>
                <button onClick={analyzeJD} disabled={!jd.trim() || analyzing} className="btn-primary text-sm px-5 py-2.5 disabled:opacity-50">
                  {analyzing ? (
                    <span className="flex items-center gap-2"><Loader2 size={13} className="animate-spin" />Analyzing...</span>
                  ) : (
                    <><Sparkles size={14} /> Analyze Job</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Job Match Score</div>
                  <div className="text-4xl font-black text-indigo-600">{jdResult.match_score}%</div>
                </div>
                <button onClick={() => { setJdResult(null); setJd(""); }} className="btn-secondary text-xs px-3 py-1.5">Analyze Another</button>
              </div>

              {jdResult.skills_required && jdResult.skills_required.length > 0 && (
                <>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Required Skills vs Your Level</div>
                  <div className="space-y-3 mb-4">
                    {jdResult.skills_required.map(({ skill, required, current }) => (
                      <div key={skill}>
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="font-medium text-slate-700">{skill}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-600 font-semibold">You: {current}%</span>
                            <span className="text-slate-400">Req: {required}%</span>
                            {current >= required ? <CheckCircle size={12} className="text-emerald-500" /> : <span className="text-red-400 font-bold">-{required - current}%</span>}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 relative">
                          <div className="absolute top-0 h-full w-0.5 bg-slate-300 z-10" style={{ left: `${required}%` }} />
                          <div className="h-full rounded-full" style={{ width: `${current}%`, background: current >= required ? "#10b981" : "#4f46e5" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button onClick={() => { saveTarget(selected); setJdResult(null); }} className="btn-primary w-full justify-center text-sm py-2.5">
                <Target size={14} /> Update Roadmap for This Role <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* AI Insight */}
          {jdResult?.insight && (
            <div className="card p-4 mt-4 flex items-start gap-3">
              <Sparkles size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-1">AI Career Insight</div>
                <div className="text-xs text-slate-500 leading-relaxed">{jdResult.insight}</div>
                {jdResult.top_gap && (
                  <button className="text-xs text-indigo-600 font-semibold mt-2 flex items-center gap-1">
                    Fix {jdResult.top_gap} gap <ChevronRight size={11} />
                  </button>
                )}
              </div>
            </div>
          )}

          {!jdResult && (
            <div className="card p-4 mt-4 flex items-start gap-3">
              <Sparkles size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-1">Tip</div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Paste a real job description to get a precise match score and a list of required skills compared against your profile.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
