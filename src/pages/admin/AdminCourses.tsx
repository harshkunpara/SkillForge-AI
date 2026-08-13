import { useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search } from "lucide-react";

const COURSES = [
  { title: "SQL Fundamentals for Developers", provider: "Coursera", skill: "SQL", difficulty: "Beginner", duration: "3 weeks", status: "Published", enrollments: 4820 },
  { title: "Advanced DSA with Java", provider: "LeetCode", skill: "DSA", difficulty: "Intermediate", duration: "6 weeks", status: "Published", enrollments: 8210 },
  { title: "DBMS and Database Design", provider: "NPTEL", skill: "DBMS", difficulty: "Intermediate", duration: "4 weeks", status: "Published", enrollments: 3640 },
  { title: "Spring Boot & Microservices", provider: "Udemy", skill: "Backend", difficulty: "Intermediate", duration: "5 weeks", status: "Published", enrollments: 6100 },
  { title: "System Design Fundamentals", provider: "ByteByByte", skill: "System Design", difficulty: "Advanced", duration: "4 weeks", status: "Published", enrollments: 2890 },
  { title: "React Advanced Patterns", provider: "Frontend Masters", skill: "React", difficulty: "Advanced", duration: "3 weeks", status: "Draft", enrollments: 0 },
  { title: "Python for Data Science", provider: "DataCamp", skill: "Python", difficulty: "Beginner", duration: "5 weeks", status: "Published", enrollments: 5420 },
  { title: "AWS Solutions Architect", provider: "AWS", skill: "Cloud", difficulty: "Advanced", duration: "8 weeks", status: "Unpublished", enrollments: 1240 },
];

const diffColor = (d: string) => d === "Beginner" ? "badge-green" : d === "Intermediate" ? "badge-yellow" : "badge-red";
const statusBadge = (s: string) => s === "Published" ? "badge-green" : s === "Draft" ? "badge-yellow" : "badge-red";

export default function AdminCourses() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = COURSES.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.provider.toLowerCase().includes(search.toLowerCase()) ||
    c.skill.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Course Management</h1>
          <p className="text-gray-500 mt-0.5">Manage courses available for AI recommendations.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm px-4 py-2">
          <Plus size={14} /> Add Course
        </button>
      </div>

      {showAdd && (
        <div className="admin-card mb-5 animate-fade-in">
          <h3 className="font-bold text-gray-900 mb-4">Add New Course</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: "Course Title", placeholder: "e.g. Advanced SQL Mastery" },
              { label: "Provider", placeholder: "e.g. Coursera" },
              { label: "Primary Skill", placeholder: "e.g. SQL" },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                <input placeholder={placeholder} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Difficulty</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none">
                {["Beginner", "Intermediate", "Advanced"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Duration</label>
              <input placeholder="e.g. 4 weeks" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
              <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none">
                {["Draft", "Published", "Unpublished"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowAdd(false)}>Save Course</button>
            <button className="btn-secondary text-sm px-4 py-2" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none" />
        </div>
      </div>

      <div className="admin-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Course", "Provider", "Skill", "Difficulty", "Duration", "Status", "Enrollments", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ title, provider, skill, difficulty, duration, status, enrollments }) => (
              <tr key={title} className="table-row border-b border-gray-50 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 text-sm max-w-xs">{title}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{provider}</td>
                <td className="px-4 py-3"><span className="badge-blue">{skill}</span></td>
                <td className="px-4 py-3"><span className={diffColor(difficulty)}>{difficulty}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{duration}</td>
                <td className="px-4 py-3"><span className={statusBadge(status)}>{status}</span></td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{enrollments.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit size={13} /></button>
                    <button className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      {status === "Published" ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
