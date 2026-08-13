import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Users, Brain, Target, BookOpen, FolderOpen, Award,
  Mic, Sparkles, ClipboardList, BarChart2, FileText, Settings,
  Search, Bell, Menu, X, ChevronDown, LogOut, Shield
} from "lucide-react";

const adminNav = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Users, label: "Students", path: "/admin/users" },
  { icon: Brain, label: "Skills", path: "/admin/skills" },
  { icon: Target, label: "Careers", path: "/admin/careers" },
  { icon: BookOpen, label: "Courses", path: "/admin/courses" },
  { icon: FolderOpen, label: "Projects", path: "/admin/projects" },
  { icon: Award, label: "Certifications", path: "/admin/certifications" },
  { icon: Mic, label: "Interview Questions", path: "/admin/questions" },
  { icon: Sparkles, label: "AI Recommendations", path: "/admin/ai" },
  { icon: ClipboardList, label: "Assessments", path: "/admin/assessments" },
  { icon: BarChart2, label: "Analytics", path: "/admin/analytics" },
  { icon: FileText, label: "Reports", path: "/admin/reports" },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Admin Sidebar - distinct from student sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 flex flex-col w-60 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#111827", minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">SkillForge</div>
            <div className="text-xs text-amber-400 font-semibold">ADMIN</div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {adminNav.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/admin"}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
          <NavLink to="/admin/settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}>
            <Settings size={15} />
            <span>System Settings</span>
          </NavLink>
          <button className="sidebar-nav-item w-full" onClick={() => navigate("/login")}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">A</div>
            <div>
              <div className="text-white text-sm font-medium">Admin User</div>
              <div className="text-slate-400 text-xs">admin@skillforge.ai</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-gray-200">
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex-1 max-w-sm relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students, skills..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <Shield size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Admin Panel</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
