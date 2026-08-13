import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Eye, EyeOff, ArrowRight, Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const isRegister = location.pathname === "/register";
  const [mode, setMode] = useState<"login" | "register" | "forgot">(isRegister ? "register" : "login");
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === "forgot") { setSubmitted(true); return; }
    setLoading(true);

    if (mode === "register") {
      const { error: err, needsConfirmation } = await signUp(email, password, name);
      if (err) { setError(err); setLoading(false); return; }
      if (needsConfirmation) {
        // Email confirmation required — show clear message instead of silent redirect
        setInfo(`Check your inbox at ${email} — click the confirmation link, then come back and sign in.`);
        setMode("login");
        setLoading(false);
        return;
      }
      navigate("/onboarding");
    } else {
      const { error: err } = await signIn(email, password);
      if (err) { setError(err); setLoading(false); return; }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-12 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #4f46e5, transparent)" }} />
          <div className="absolute bottom-32 right-10 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <span className="text-white font-black text-sm">SF</span>
            </div>
            <span className="text-white font-bold text-lg">SkillForge AI</span>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">Turn your skills<br />into your career.</h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">AI-powered resume analysis, skill gap detection, adaptive roadmaps, and mock interviews — all personalized to your goals.</p>

          <div className="space-y-3">
            {[
              "Upload your resume for instant AI skill extraction",
              "See exactly what's missing for your target role",
              "Get a roadmap that adapts as you improve",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <Sparkles size={14} className="text-indigo-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors">
            <ArrowLeft size={15} /> Back to home
          </button>

          {info && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
              {info}
            </div>
          )}

          {mode === "login" && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-black text-slate-900 mb-1">Welcome back</h1>
              <p className="text-slate-500 mb-8">Sign in to continue your career journey.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="harsh@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all pr-12" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60">
                  {loading ? "Signing in..." : <><span>Sign In</span> <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-xs text-slate-400 bg-white px-3">or continue with</div>
              </div>

              <button className="btn-secondary w-full justify-center py-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <p className="text-center text-sm text-slate-500 mt-6">
                Don't have an account? <button onClick={() => setMode("register")} className="text-indigo-600 font-semibold hover:text-indigo-700">Create account</button>
              </p>

              <div className="mt-4 text-center">
                <button onClick={() => navigate("/admin")} className="text-xs text-slate-400 hover:text-slate-600 underline">Admin Login</button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-black text-slate-900 mb-1">Create your account</h1>
              <p className="text-slate-500 mb-8">Start your AI-powered career journey.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Harsh Patel"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="harsh@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a strong password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all pr-12" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60">
                  {loading ? "Creating account..." : <><span>Create Account</span> <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-xs text-slate-400 bg-white px-3">or continue with</div>
              </div>

              <button className="btn-secondary w-full justify-center py-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account? <button onClick={() => setMode("login")} className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</button>
              </p>
            </div>
          )}

          {mode === "forgot" && (
            <div className="animate-fade-in">
              <button onClick={() => setMode("login")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
                <ArrowLeft size={15} /> Back to login
              </button>
              {!submitted ? (
                <>
                  <h1 className="text-3xl font-black text-slate-900 mb-1">Reset password</h1>
                  <p className="text-slate-500 mb-8">Enter your email and we'll send you a reset link.</p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email address</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="harsh@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
                    </div>
                    <button type="submit" className="btn-primary w-full justify-center py-3">Send Reset Link</button>
                  </form>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={24} className="text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
                  <p className="text-slate-500 text-sm mb-6">We sent a password reset link to <strong>{email}</strong></p>
                  <button onClick={() => { setMode("login"); setSubmitted(false); }} className="text-indigo-600 font-medium text-sm hover:text-indigo-700">Back to login</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
