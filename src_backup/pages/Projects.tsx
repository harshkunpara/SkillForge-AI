import { useState, useEffect } from "react";
import { FolderOpen, Clock, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { useSkillGaps } from "../hooks/useSupabaseData";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const BASE_PROJECTS = [
  {
    title: "AI Campus Placement Platform",
    difficulty: "Advanced",
    duration: "5–6 weeks",
    why: ["Improves Java", "Improves SQL", "Adds backend experience", "Demonstrates authentication", "Relevant to SDE roles", "Full-stack portfolio piece"],
    skills: ["Java", "Spring Boot", "MySQL", "React", "JWT Auth", "REST APIs"],
    resumeImpact: "High",
    description: "Build a platform that helps students analyze their skills, generate learning roadmaps, and track placement readiness. Uses AI APIs to generate personalized content.",
  },
  {
    title: "Library Management System",
    difficulty: "Intermediate",
    duration: "3–4 weeks",
    why: ["SQL schema design", "CRUD with Java", "Authentication", "Relevant to data-heavy SDE roles", "Clean architecture practice"],
    skills: ["Java", "MySQL", "Hibernate", "REST APIs", "Git"],
    resumeImpact: "High",
    description: "A full-featured library management system with book tracking, member management, and fine calculation. Demonstrates solid SQL and backend skills.",
  },
  {
    title: "Real-time Chat Application",
    difficulty: "Intermediate",
    duration: "2–3 weeks",
    why: ["WebSocket experience", "Backend scalability concepts", "React frontend", "Demonstrates async programming"],
    skills: ["Node.js", "WebSocket", "React", "MongoDB", "JWT"],
    resumeImpact: "Medium",
    description: "A real-time chat app with rooms, user authentication, and message history. Shows understanding of real-time communication and distributed systems basics.",
  },
];

const PHASES = [
  { phase: 1, title: "Database Design", tasks: ["Design ER diagram", "Create MySQL schema", "Seed test data"] },
  { phase: 2, title: "Backend APIs", tasks: ["Set up Spring Boot", "Build REST endpoints", "Implement business logic"] },
  { phase: 3, title: "Authentication", tasks: ["JWT implementation", "Role-based access control", "Session management"] },
  { phase: 4, title: "Frontend", tasks: ["React component structure", "API integration", "Responsive design"] },
  { phase: 5, title: "Testing", tasks: ["Unit tests", "API testing with Postman", "Bug fixes"] },
  { phase: 6, title: "Deployment", tasks: ["Deploy backend on Render", "Deploy frontend on Vercel", "Write README"] },
];

interface ResumeProject {
  name: string;
  description?: string;
  technologies?: string[];
  role?: string;
  skills_demonstrated?: string[];
}

export default function Projects() {
  const { user, profile } = useAuth();
  const { gaps } = useSkillGaps();
  const [tab, setTab] = useState<"mine" | "recommended">("mine");
  const [selected, setSelected] = useState<number | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [myProjects, setMyProjects] = useState<ResumeProject[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("resume_data").eq("id", user.id).single().then(({ data }) => {
      const rd = data?.resume_data as { projects?: ResumeProject[] } | null;
      setMyProjects(rd?.projects || []);
    });
  }, [user]);

  // Match is derived entirely from real skill_gaps overlap — no fabricated baseline.
  // null when the user has no open gaps to compare against yet.
  const PROJECTS = BASE_PROJECTS.map((p) => {
    const overlap = gaps.filter((g) =>
      p.skills.some((s) => s.toLowerCase().includes(g.skill_name.toLowerCase()))
    ).length;
    const match = gaps.length > 0 ? Math.round((overlap / gaps.length) * 100) : null;
    return { ...p, match, overlap };
  }).sort((a, b) => (b.match ?? -1) - (a.match ?? -1));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Projects</h1>
        <p className="text-slate-500 mt-1">Your resume projects and AI-recommended new projects.</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        <button onClick={() => { setTab("mine"); setSelected(null); }}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <FolderOpen size={14} /> My Projects {myProjects.length > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded-full">{myProjects.length}</span>}
        </button>
        <button onClick={() => { setTab("recommended"); setSelected(null); }}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "recommended" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <Sparkles size={14} /> AI Recommended
        </button>
      </div>

      {/* MY PROJECTS TAB */}
      {tab === "mine" && (
        <div>
          {myProjects.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🗂️</div>
              <div className="font-bold text-slate-900 text-lg mb-2">No projects extracted yet</div>
              <div className="text-slate-500 text-sm mb-4">Upload your resume and AI will automatically extract your projects here.</div>
              <a href="/resume" className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"><Sparkles size={14} /> Analyze Resume</a>
            </div>
          ) : (
            <div className="space-y-4">
              {myProjects.map((p, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "linear-gradient(135deg, #eef2ff, #f0fdf4)" }}>
                      🛠️
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 mb-1">{p.name}</div>
                      {p.description && <p className="text-sm text-slate-600 mb-2 leading-relaxed">{p.description}</p>}
                      {p.role && <div className="text-xs text-slate-500 mb-2"><span className="font-medium">Role:</span> {p.role}</div>}
                      {p.technologies && p.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {p.technologies.map((t) => <span key={t} className="badge-blue text-xs">{t}</span>)}
                        </div>
                      )}
                      {p.skills_demonstrated && p.skills_demonstrated.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.skills_demonstrated.map((s) => (
                            <div key={s} className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle size={10} /> {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RECOMMENDED PROJECTS TAB */}
      {tab === "recommended" && (
        <div>
          {/* Project detail panel */}
          {selected !== null && !showPlan && (
            <div className="card p-6 mb-6 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{PROJECTS[selected].title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{PROJECTS[selected].description}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Difficulty</div>
                  <div className="font-bold text-slate-900 text-sm">{PROJECTS[selected].difficulty}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Duration</div>
                  <div className="font-bold text-slate-900 text-sm">{PROJECTS[selected].duration}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">Resume Impact</div>
                  <div className={`font-bold text-sm ${PROJECTS[selected].resumeImpact === "High" ? "text-emerald-600" : "text-amber-600"}`}>{PROJECTS[selected].resumeImpact}</div>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Skills Gained</div>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECTS[selected].skills.map((s) => <span key={s} className="badge-blue">{s}</span>)}
                </div>
              </div>
              <div className="mb-5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why this project?</div>
                <div className="space-y-1.5">
                  {PROJECTS[selected].why.map((w) => (
                    <div key={w} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />{w}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPlan(true)} className="btn-primary text-sm px-5 py-2.5">
                  <Sparkles size={14} /> Generate Project Plan
                </button>
                <button className="btn-secondary text-sm px-5 py-2.5">Add to Roadmap</button>
              </div>
            </div>
          )}

          {/* Project Plan */}
          {showPlan && selected !== null && (
            <div className="card p-6 mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="ai-tag mb-2"><Sparkles size={9} /> AI Project Plan</div>
                  <h2 className="text-xl font-black text-slate-900">{PROJECTS[selected].title}</h2>
                </div>
                <button onClick={() => setShowPlan(false)} className="btn-secondary text-xs px-3 py-1.5">← Back</button>
              </div>
              <div className="space-y-3">
                {PHASES.map(({ phase, title, tasks }) => (
                  <div key={phase} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                        {phase}
                      </div>
                      {phase < PHASES.length && <div className="w-0.5 h-8 bg-slate-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-semibold text-slate-900 mb-2">Phase {phase}: {title}</div>
                      <ul className="space-y-1">
                        {tasks.map((t) => <li key={t} className="text-sm text-slate-500 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />{t}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary text-sm px-5 py-2.5 mt-4">
                Add to My Roadmap <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Project cards */}
          <div className="space-y-4">
            {PROJECTS.map(({ title, match, difficulty, duration, why, skills, resumeImpact }, i) => (
              <div key={title} className={`card p-5 cursor-pointer transition-all ${selected === i ? "ring-2 ring-indigo-300" : "hover:shadow-md"}`} onClick={() => { setSelected(i); setShowPlan(false); }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                    <FolderOpen size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-slate-900">{title}</h3>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-xl font-black text-indigo-600">{match !== null ? `${match}%` : "—"}</div>
                        <div className="text-[10px] text-slate-400">gap match</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={11} /> {duration}</span>
                      <span className={`text-xs font-semibold ${difficulty === "Advanced" ? "text-red-500" : "text-amber-600"}`}>{difficulty}</span>
                      <span className={`text-xs font-semibold ${resumeImpact === "High" ? "text-emerald-600" : "text-blue-600"}`}>Resume Impact: {resumeImpact}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {skills.slice(0, 4).map((s) => <span key={s} className="badge-blue">{s}</span>)}
                      {skills.length > 4 && <span className="badge-blue">+{skills.length - 4} more</span>}
                    </div>
                    <div className="space-y-1">
                      {why.slice(0, 3).map((w) => (
                        <div key={w} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
