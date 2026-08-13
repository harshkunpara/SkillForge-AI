import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Target, Brain, FileText, TrendingUp, Map, FolderOpen,
  Mic, Lightbulb, BarChart2, GitBranch, Settings, HelpCircle,
  Search, Bell, Sparkles, Menu, X, ChevronDown, LogOut, User
} from "lucide-react";
import AIAssistant from "../components/AIAssistant";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Target, label: "Career Goal", path: "/career" },
  { icon: Brain, label: "My Skills", path: "/skills" },
  { icon: FileText, label: "Resume Analyzer", path: "/resume" },
  { icon: TrendingUp, label: "Skill Gap", path: "/skill-gap" },
  { icon: Map, label: "Roadmap", path: "/roadmap" },
  { icon: FolderOpen, label: "Projects", path: "/projects" },
  { icon: Mic, label: "Interviews", path: "/interviews" },
  { icon: Lightbulb, label: "Recommendations", path: "/recommendations" },
  { icon: BarChart2, label: "Analytics", path: "/analytics" },
  { icon: GitBranch, label: "GitHub", path: "/github" },
  { icon: User, label: "My Profile", path: "/profile" },
];

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const readiness = profile?.placement_readiness ?? 0;
  const initials = (profile?.full_name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 flex flex-col w-64 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#0f172a", minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <span className="text-white font-bold text-sm">SF</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">SkillForge</div>
              <div className="text-xs font-medium" style={{ color: "#818cf8" }}>AI</div>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Readiness pill */}
        <div className="mx-4 mt-4 rounded-lg p-3" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Placement Readiness</span>
            <span className="text-xs font-bold" style={{ color: "#a5b4fc" }}>{readiness}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: `${readiness}%`, background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }} />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
          <button className="sidebar-nav-item w-full">
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button className="sidebar-nav-item w-full">
            <HelpCircle size={16} />
            <span>Help</span>
          </button>
          <button className="sidebar-nav-item w-full" onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{profile?.full_name || "Student"}</div>
              <div className="text-slate-400 text-xs truncate">{profile?.target_career || "Career Goal"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-slate-100 z-10">
          <button className="lg:hidden text-slate-500 hover:text-slate-900" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search skills, courses, topics..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* AI Assistant button */}
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <Sparkles size={13} />
              Ask SkillForge
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {(profile as { avatar_url?: string })?.avatar_url ? (
                  <img src={(profile as { avatar_url?: string }).avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>{initials}</div>
                )}
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">{profile?.full_name || "Student"}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => { navigate("/profile"); setProfileOpen(false); }}>
                    <User size={14} /> My Profile
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Settings size={14} /> Settings
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50" onClick={handleSignOut}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant */}
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
