import { createBrowserRouter } from "react-router";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import StudentLayout from "./layouts/StudentLayout";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import SkillGap from "./pages/SkillGap";
import Roadmap from "./pages/Roadmap";
import MySkills from "./pages/MySkills";
import CareerTarget from "./pages/CareerTarget";
import Projects from "./pages/Projects";
import Interviews from "./pages/Interviews";
import Recommendations from "./pages/Recommendations";
import Analytics from "./pages/Analytics";
import GitHubAnalyzer from "./pages/GitHubAnalyzer";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSkills from "./pages/admin/AdminSkills";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminSettings from "./pages/admin/AdminSettings";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/login", Component: Login },
  { path: "/register", Component: Login },
  { path: "/onboarding", Component: Onboarding },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [{
    path: "/",
    Component: StudentLayout,
    children: [
      { path: "dashboard", Component: Dashboard },
      { path: "resume", Component: ResumeAnalyzer },
      { path: "skill-gap", Component: SkillGap },
      { path: "roadmap", Component: Roadmap },
      { path: "skills", Component: MySkills },
      { path: "career", Component: CareerTarget },
      { path: "projects", Component: Projects },
      { path: "interviews", Component: Interviews },
      { path: "recommendations", Component: Recommendations },
      { path: "analytics", Component: Analytics },
      { path: "github", Component: GitHubAnalyzer },
      { path: "profile", Component: Profile },
    ],
  }]},
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "users", Component: AdminUsers },
      { path: "skills", Component: AdminSkills },
      { path: "courses", Component: AdminCourses },
      { path: "settings", Component: AdminSettings },
    ],
  },
]);
