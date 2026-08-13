import { useNavigate } from "react-router";
import { ArrowRight, CheckCircle, Sparkles, TrendingUp, Brain, FileText, Mic, GitBranch, BarChart2, ChevronRight } from "lucide-react";

const FEATURES = [
  { icon: FileText, title: "AI Resume Analysis", desc: "Upload your resume and get instant skill extraction, scoring, and improvement suggestions.", color: "#4f46e5" },
  { icon: Brain, title: "Skill Gap Detection", desc: "See exactly what skills you're missing for your target role, with priority rankings.", color: "#7c3aed" },
  { icon: TrendingUp, title: "Adaptive Roadmaps", desc: "AI-generated learning paths that update as you improve, keeping you on the fastest track.", color: "#2563eb" },
  { icon: Mic, title: "AI Interview Coach", desc: "Practice with an AI interviewer that evaluates technical accuracy, communication, and depth.", color: "#059669" },
  { icon: GitBranch, title: "Portfolio Analysis", desc: "Connect GitHub and get automated code quality, documentation, and project depth scores.", color: "#d97706" },
  { icon: BarChart2, title: "Placement Analytics", desc: "Track readiness across DSA, development, CS fundamentals, projects, and interviews.", color: "#dc2626" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Upload Resume", desc: "Our AI reads and extracts every skill, project, and experience from your resume." },
  { step: "02", title: "Choose Target Career", desc: "Select your dream role or paste a real job description to analyze requirements." },
  { step: "03", title: "Discover Skill Gaps", desc: "See a precise map of what you know vs. what employers need, with explanations." },
  { step: "04", title: "Follow Your Roadmap", desc: "AI builds a personalized, phased learning plan with courses, projects, and certifications." },
  { step: "05", title: "Become Job Ready", desc: "Practice interviews, track progress, and watch your placement readiness score climb." },
];

const TRUSTED = ["IIT Bombay", "NIT Trichy", "VIT Vellore", "BITS Pilani", "IIT Delhi", "Manipal University"];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <span className="text-white font-bold text-sm">SF</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">SkillForge <span className="gradient-text">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it Works", "Pricing", "For Universities"].map((item) => (
              <a key={item} href="#" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">Login</button>
            <button onClick={() => navigate("/register")} className="btn-primary text-sm px-5 py-2">Get Started <ArrowRight size={14} /></button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f5f3ff 100%)" }}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #4f46e5, transparent)" }} />
          <div className="absolute top-60 -left-20 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <Sparkles size={13} />
              AI-Powered Career Intelligence
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] mb-6 tracking-tight">
              Your AI<br />
              <span className="gradient-text">Career Mentor.</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-500 font-normal max-w-2xl mx-auto mb-4 leading-relaxed">
              Know what you know.
              <br />
              <span className="text-slate-700 font-medium">Discover what you're missing.</span>
              <br />
              Build what employers want.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <button
                onClick={() => navigate("/register")}
                className="btn-primary text-base px-8 py-3.5"
              >
                Build My Career Roadmap <ArrowRight size={16} />
              </button>
              <button className="btn-secondary text-base px-8 py-3.5">
                See How It Works
              </button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50" style={{ background: "#0f172a" }}>
              {/* Mock browser bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4 bg-white/5 rounded px-3 py-1 text-xs text-slate-500">app.skillforge.ai/dashboard</div>
              </div>
              {/* Mini dashboard UI */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {/* Readiness */}
                <div className="col-span-1 rounded-xl p-4" style={{ background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.3)" }}>
                  <div className="text-slate-400 text-xs font-medium mb-3">Placement Readiness</div>
                  <div className="flex items-center justify-center mb-3">
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#818cf8" strokeWidth="8" strokeDasharray="251" strokeDashoffset="90" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <TrendingUp size={22} className="text-indigo-300" />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 text-center">Updates as you progress</div>
                </div>

                {/* Skill gaps */}
                <div className="col-span-1 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-slate-400 text-xs font-medium mb-3">Skill Gap</div>
                  {[["DSA", 80, "#818cf8"], ["SQL", 25, "#f87171"], ["System Design", 35, "#fbbf24"]].map(([label, val, color]) => (
                    <div key={label as string} className="mb-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{label}</span>
                        <span>{val}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${val}%`, background: color as string }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Recommendations */}
                <div className="col-span-1 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-slate-400 text-xs font-medium mb-3 flex items-center gap-1">
                    <Sparkles size={10} className="text-indigo-400" /> AI Recommendations
                  </div>
                  {["Complete SQL Joins module", "Solve 3 DSA problems", "Mock interview session"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm text-slate-400 font-medium mb-8">Trusted by students from India's top universities</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {TRUSTED.map((name) => (
              <span key={name} className="text-sm font-semibold text-slate-400">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Platform Features</div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Everything you need to get placed</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Not a course platform. Not a chatbot. A complete AI-powered career operating system built for students.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card p-6 group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-0.5" style={{ background: `${color}15` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">The Process</div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">How SkillForge works</h2>
          </div>
          <div className="space-y-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="flex items-start gap-6 card p-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: i % 2 === 0 ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#0f172a", color: "white" }}>
                  {step}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && <ChevronRight size={20} className="text-slate-300 flex-shrink-0 mt-1" />}
                {i === HOW_IT_WORKS.length - 1 && <CheckCircle size={20} className="text-emerald-500 flex-shrink-0 mt-1" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Adaptive Roadmap section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-3">Dynamic Intelligence</div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 leading-tight">Your roadmap changes<br />as you improve.</h2>
              <p className="text-slate-500 leading-relaxed mb-6">SkillForge AI continuously analyzes your assessment scores, learning pace, and interview performance to adapt your roadmap in real time. When you ace a skill, it moves you forward. When you struggle, it adds targeted practice.</p>
              <div className="space-y-3">
                {[
                  "Roadmap updates after every assessment",
                  "AI detects weak areas from mock interviews",
                  "Priority changes based on job requirements",
                  "Skips content you've already mastered",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-indigo-600 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Roadmap visualization */}
            <div className="rounded-2xl p-6" style={{ background: "#0f172a" }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="ai-tag">AI Updated</span>
                <span className="text-xs text-slate-400">2 hours ago</span>
              </div>
              {[
                { phase: "Phase 1", title: "Strengthen Fundamentals", status: "completed", color: "#10b981" },
                { phase: "Phase 2", title: "Advanced DSA", status: "active", color: "#4f46e5" },
                { phase: "Phase 3", title: "SQL Fundamentals", status: "added", color: "#f59e0b" },
                { phase: "Phase 4", title: "Backend Development", status: "pending", color: "#475569" },
                { phase: "Phase 5", title: "Interview Preparation", status: "pending", color: "#475569" },
              ].map(({ phase, title, status, color }, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500">{phase}</div>
                    <div className={`text-sm font-medium ${status === "pending" ? "text-slate-600" : "text-slate-200"}`}>{title}</div>
                  </div>
                  {status === "added" && <span className="badge-yellow text-[10px]">AI Added</span>}
                  {status === "completed" && <span className="badge-green text-[10px]">Done</span>}
                  {status === "active" && <span className="badge-blue text-[10px]">Active</span>}
                </div>
              ))}
              <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <div className="text-xs text-amber-400 font-medium mb-1">Roadmap updated by AI</div>
                <div className="text-xs text-slate-400">"SQL assessment score was below target. SQL Fundamentals added to Phase 3."</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-indigo-300 text-sm font-medium mb-6">
            <Sparkles size={13} /> Ready to get placed?
          </div>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">Start your AI-powered<br />career journey today.</h2>
          <p className="text-slate-400 mb-8">Close your skill gaps and build the profile employers are looking for.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/register")} className="btn-primary text-base px-8 py-3.5">
              Build My Career Roadmap <ArrowRight size={16} />
            </button>
            <button className="text-base px-8 py-3.5 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
              For Universities
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <span className="text-white font-bold text-xs">SF</span>
              </div>
              <span className="text-white font-bold">SkillForge AI</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              {["Privacy Policy", "Terms of Service", "Contact", "For Universities"].map((item) => (
                <a key={item} href="#" className="hover:text-slate-300 transition-colors">{item}</a>
              ))}
            </div>
            <div className="text-xs text-slate-600">© 2026 SkillForge AI. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
