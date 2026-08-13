import { useState, useEffect } from "react";
import { BookOpen, Award, Sparkles, ArrowRight, Clock, ExternalLink, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { callEdgeFunction, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface CourseRec {
  title: string;
  provider: string;
  match: number;
  difficulty: string;
  duration: string;
  skill_focus: string;
  priority: string;
  why: string;
  url?: string;
}

interface CertRec {
  title: string;
  provider: string;
  difficulty: string;
  duration: string;
  relevance: string;
  skills: string[];
  why: string;
}

interface ProjectRec {
  title: string;
  description: string;
  skills: string[];
  difficulty: string;
  why: string;
}

interface RecommendationsData {
  courses: CourseRec[];
  certifications: CertRec[];
  projects: ProjectRec[];
}

interface ResumeCert {
  name: string;
  issuer?: string;
  date?: string;
  credential_id?: string;
}

const priorityColor = (p: string) => p === "Critical" || p === "critical" ? "badge-red" : p === "High" || p === "high" ? "badge-yellow" : "badge-blue";

export default function Recommendations() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"courses" | "certifications" | "projects">("courses");
  const [certTab, setCertTab] = useState<"mine" | "recommended">("mine");
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myCerts, setMyCerts] = useState<ResumeCert[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("resume_data").eq("id", user.id).single().then(({ data: d }) => {
      const rd = d?.resume_data as { certifications?: ResumeCert[] } | null;
      setMyCerts(rd?.certifications || []);
    });
  }, [user]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callEdgeFunction<RecommendationsData>("generate-recommendations", {});
      setData(result);
    } catch (e) {
      const errMsg = String(e).toLowerCase();
      const isNetworkError = errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('cors') || errMsg.includes('status 40');
      if (isNetworkError) {
        setData({
          courses: [
            { title: 'Advanced React Patterns', provider: 'Udemy', match: 95, difficulty: 'Intermediate', duration: '24h', skill_focus: 'React', priority: 'Critical', why: 'Directly addresses your React skill gap', url: '#' },
            { title: 'TypeScript Masterclass', provider: 'Coursera', match: 90, difficulty: 'Intermediate', duration: '30h', skill_focus: 'TypeScript', priority: 'High', why: 'TypeScript is essential for modern development', url: '#' },
            { title: 'System Design Fundamentals', provider: 'educative.io', match: 85, difficulty: 'Advanced', duration: '40h', skill_focus: 'System Design', priority: 'High', why: 'Critical for senior engineering roles', url: '#' },
          ],
          certifications: [
            { title: 'AWS Cloud Practitioner', provider: 'Amazon', difficulty: 'Beginner', duration: '40h study', relevance: 'High', skills: ['Cloud', 'AWS', 'DevOps'], why: 'Cloud skills are in high demand for full-stack roles' },
            { title: 'Meta Front-End Developer', provider: 'Meta / Coursera', difficulty: 'Intermediate', duration: '7 months', relevance: 'High', skills: ['React', 'JavaScript', 'CSS'], why: 'Validates your frontend expertise with industry recognition' },
          ],
          projects: [
            { title: 'Real-time Chat Application', description: 'Build a chat app with WebSockets, authentication, and message persistence', skills: ['React', 'Node.js', 'WebSockets', 'SQL'], difficulty: 'Intermediate', why: 'Demonstrates full-stack and real-time communication skills' },
            { title: 'CI/CD Pipeline Dashboard', description: 'Create a dashboard that monitors GitHub Actions workflows', skills: ['DevOps', 'React', 'API Integration'], difficulty: 'Intermediate', why: 'Addresses your DevOps skill gap with a practical project' },
            { title: 'E-commerce Microservice', description: 'Design and build a scalable product catalog microservice', skills: ['System Design', 'Node.js', 'SQL', 'Docker'], difficulty: 'Advanced', why: 'Directly addresses system design and architecture gaps' },
          ],
        });
        setError('Notice: Showing demo recommendations (Edge Function offline).');
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Recommended Learning</h1>
          <p className="text-slate-500 mt-1">Personalized recommendations based on your skill gaps and target role.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm px-3 py-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        {[
          { key: "courses", label: "Courses", icon: BookOpen },
          { key: "certifications", label: "Certifications", icon: Award },
          { key: "projects", label: "Projects", icon: Sparkles },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-64 gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <div className="text-slate-500 text-sm">Generating personalized recommendations with AI...</div>
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-sm text-slate-600 mb-4">{error}</div>
          <button onClick={load} className="btn-primary text-sm px-4 py-2">Try Again</button>
        </div>
      ) : (
        <>
          {/* Courses */}
          {tab === "courses" && (
            <div className="space-y-4">
              {(data?.courses ?? []).length === 0 ? (
                <div className="card p-8 text-center text-slate-400">No course recommendations yet. Complete your profile first.</div>
              ) : (
                (data?.courses ?? []).map((c, i) => (
                  <div key={i} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                        📚
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-bold text-slate-900">{c.title}</div>
                            <div className="text-xs text-slate-400">{c.provider}</div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="text-xl font-black text-indigo-600">{c.match}%</div>
                            <div className="text-[10px] text-slate-400">match</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={priorityColor(c.priority)}>{c.priority}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} />{c.duration}</span>
                          <span className="text-xs text-slate-500">{c.difficulty}</span>
                        </div>

                        <div className="rounded-xl p-3 mb-3" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                          <div className="text-xs text-indigo-700 flex items-start gap-1.5">
                            <Sparkles size={11} className="flex-shrink-0 mt-0.5" />
                            <span><strong>Why recommended:</strong> {c.why}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button className="btn-primary text-sm px-4 py-2">Start Learning</button>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5">
                              View Details <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Certifications */}
          {tab === "certifications" && (
            <div>
              {/* Sub-tab selector */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 w-fit">
                <button onClick={() => setCertTab("mine")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${certTab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  <CheckCircle size={13} /> My Certifications {myCerts.length > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 rounded-full">{myCerts.length}</span>}
                </button>
                <button onClick={() => setCertTab("recommended")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${certTab === "recommended" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  <Sparkles size={13} /> AI Recommended
                </button>
              </div>

              {/* MY CERTIFICATIONS */}
              {certTab === "mine" && (
                <div className="space-y-4">
                  {myCerts.length === 0 ? (
                    <div className="card p-12 text-center">
                      <div className="text-5xl mb-4">🏆</div>
                      <div className="font-bold text-slate-900 text-lg mb-2">No certifications found</div>
                      <div className="text-slate-500 text-sm mb-4">Upload your resume and AI will extract your certifications here.</div>
                      <a href="/resume" className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"><Sparkles size={14} /> Analyze Resume</a>
                    </div>
                  ) : (
                    myCerts.map((c, i) => (
                      <div key={i} className="card p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
                            ✅
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 mb-1">{c.name}</div>
                            {c.issuer && <div className="text-xs text-slate-400 mb-2">{c.issuer}</div>}
                            <div className="flex flex-wrap gap-2">
                              {c.date && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} /> {c.date}</span>}
                              {c.credential_id && <span className="text-xs text-slate-400">ID: {c.credential_id}</span>}
                              <span className="badge-green">Earned</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* AI RECOMMENDED CERTIFICATIONS */}
              {certTab === "recommended" && (
                <div className="space-y-4">
                  {(data?.certifications ?? []).length === 0 ? (
                    <div className="card p-8 text-center text-slate-400">No certification recommendations yet.</div>
                  ) : (
                    (data?.certifications ?? []).map((c, i) => (
                      <div key={i} className="card p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)" }}>
                            🏆
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-bold text-slate-900">{c.title}</div>
                                <div className="text-xs text-slate-400">{c.provider}</div>
                              </div>
                              <span className={c.relevance === "High" || c.relevance === "high" ? "badge-green" : "badge-yellow"}>{c.relevance} Relevance</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} />{c.duration}</span>
                              <span className="text-xs text-slate-500">{c.difficulty}</span>
                              {(c.skills || []).map((s) => <span key={s} className="badge-blue">{s}</span>)}
                            </div>
                            <div className="rounded-xl p-3 mb-3" style={{ background: "linear-gradient(135deg, #fffbeb, #fef9c3)" }}>
                              <div className="text-xs text-amber-700 flex items-start gap-1.5">
                                <Award size={11} className="flex-shrink-0 mt-0.5" />
                                <span><strong>Why this certification:</strong> {c.why}</span>
                              </div>
                            </div>
                            <button className="btn-primary text-sm px-4 py-2">
                              Learn More <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Projects */}
          {tab === "projects" && (
            <div className="space-y-4">
              {(data?.projects ?? []).length === 0 ? (
                <div className="card p-8 text-center text-slate-400">No project recommendations yet.</div>
              ) : (
                (data?.projects ?? []).map((p, i) => (
                  <div key={i} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "linear-gradient(135deg, #eef2ff, #f0fdf4)" }}>
                        🛠️
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-bold text-slate-900">{p.title}</div>
                          <span className="badge-blue">{p.difficulty}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{p.description}</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(p.skills || []).map((s) => <span key={s} className="badge-indigo text-xs">{s}</span>)}
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
                          <div className="text-xs text-indigo-700 flex items-start gap-1.5">
                            <Sparkles size={11} className="flex-shrink-0 mt-0.5" />
                            <span><strong>Why this project:</strong> {p.why}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
