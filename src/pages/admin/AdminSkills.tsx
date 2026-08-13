import { useState } from "react";
import { Plus, Edit, Trash2, Search, Brain } from "lucide-react";

const SKILLS = [
  { name: "SQL", category: "Database", level: "Beginner–Advanced", prerequisites: ["Programming Basics"], careers: ["SDE", "Data Analyst", "Data Scientist"], students: 3840 },
  { name: "DSA", category: "CS Fundamentals", level: "Beginner–Advanced", prerequisites: ["Programming Basics"], careers: ["SDE", "Full Stack"], students: 5200 },
  { name: "Java", category: "Backend", level: "Beginner–Advanced", prerequisites: ["Programming Basics"], careers: ["SDE", "Backend Dev"], students: 4100 },
  { name: "DBMS", category: "Database", level: "Intermediate–Advanced", prerequisites: ["SQL", "OOP"], careers: ["SDE", "DBA", "Data Analyst"], students: 2900 },
  { name: "React", category: "Frontend", level: "Beginner–Advanced", prerequisites: ["HTML/CSS", "JavaScript"], careers: ["Full Stack", "Frontend Dev"], students: 3200 },
  { name: "System Design", category: "Architecture", level: "Advanced", prerequisites: ["DSA", "Databases", "Networking"], careers: ["SDE", "Architect"], students: 1800 },
  { name: "Python", category: "Languages", level: "Beginner–Advanced", prerequisites: [], careers: ["Data Scientist", "AI/ML", "Backend Dev"], students: 2400 },
  { name: "Git", category: "Tools", level: "Beginner–Intermediate", prerequisites: [], careers: ["All"], students: 6800 },
];

const CATEGORIES = ["All", "Database", "CS Fundamentals", "Backend", "Frontend", "Architecture", "Languages", "Tools"];

export default function AdminSkills() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", category: "Backend", level: "Beginner–Advanced", prerequisites: "", careers: "" });

  const filtered = SKILLS.filter((s) =>
    (category === "All" || s.category === category) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Skills Management</h1>
          <p className="text-gray-500 mt-0.5">Manage skill definitions, categories, prerequisites, and career mappings.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm px-4 py-2">
          <Plus size={14} /> Add Skill
        </button>
      </div>

      {/* Add skill panel */}
      {showAdd && (
        <div className="admin-card mb-5 animate-fade-in">
          <h3 className="font-bold text-gray-900 mb-4">Add New Skill</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Skill Name</label>
              <input value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} placeholder="e.g. Kubernetes"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <select value={newSkill.category} onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none">
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Prerequisites (comma-separated)</label>
              <input value={newSkill.prerequisites} onChange={(e) => setNewSkill({ ...newSkill, prerequisites: e.target.value })} placeholder="e.g. Programming Basics, OOP"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Related Careers (comma-separated)</label>
              <input value={newSkill.careers} onChange={(e) => setNewSkill({ ...newSkill, careers: e.target.value })} placeholder="e.g. SDE, DevOps Engineer"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowAdd(false)}>Save Skill</button>
            <button className="btn-secondary text-sm px-4 py-2" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${category === c ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(({ name, category: cat, level, prerequisites, careers, students }) => (
          <div key={name} className="admin-card hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Brain size={16} className="text-indigo-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{name}</div>
                  <div className="text-xs text-gray-400">{cat}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit size={13} /></button>
                <button className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <div className="text-gray-400 mb-0.5">Level Range</div>
                <div className="font-medium text-gray-700">{level}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-0.5">Students w/ Gap</div>
                <div className="font-bold text-red-600">{students.toLocaleString()}</div>
              </div>
            </div>

            {prerequisites.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 mb-1">Prerequisites</div>
                <div className="flex flex-wrap gap-1">
                  {prerequisites.map((p) => <span key={p} className="badge-yellow">{p}</span>)}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-400 mb-1">Related Careers</div>
              <div className="flex flex-wrap gap-1">
                {careers.map((c) => <span key={c} className="badge-blue">{c}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
