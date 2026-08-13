import { useState } from "react";
import { Search, Filter, Eye, Edit, Ban, ChevronDown } from "lucide-react";

const USERS = [
  { name: "Harsh Patel", email: "harsh@example.com", college: "VIT Vellore", target: "Software Engineer", readiness: 78, status: "Active", last: "2 hours ago" },
  { name: "Priya Sharma", email: "priya@example.com", college: "IIT Bombay", target: "Data Scientist", readiness: 92, status: "Active", last: "1 hour ago" },
  { name: "Rohan Mehta", email: "rohan@example.com", college: "NIT Trichy", target: "Software Engineer", readiness: 85, status: "Active", last: "3 hours ago" },
  { name: "Anjali Kumar", email: "anjali@example.com", college: "BITS Pilani", target: "Full Stack Developer", readiness: 71, status: "Active", last: "Yesterday" },
  { name: "Dev Shah", email: "dev@example.com", college: "Manipal University", target: "AI/ML Engineer", readiness: 55, status: "Inactive", last: "5 days ago" },
  { name: "Sneha Nair", email: "sneha@example.com", college: "VIT Chennai", target: "Data Analyst", readiness: 63, status: "Active", last: "4 hours ago" },
  { name: "Arjun Singh", email: "arjun@example.com", college: "IIT Delhi", target: "Software Engineer", readiness: 88, status: "Active", last: "30 min ago" },
  { name: "Meera Iyer", email: "meera@example.com", college: "NIT Warangal", target: "Cloud Engineer", readiness: 47, status: "Suspended", last: "2 weeks ago" },
];

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [career, setCareer] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<typeof USERS[0] | null>(null);

  const filtered = USERS.filter((u) =>
    (career === "All" || u.target === career) &&
    (status === "All" || u.status === status) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const readinessColor = (r: number) => r >= 80 ? "text-emerald-600" : r >= 60 ? "text-amber-600" : "text-red-500";
  const statusBadge = (s: string) => s === "Active" ? "badge-green" : s === "Inactive" ? "badge-yellow" : "badge-red";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Students</h1>
          <p className="text-gray-500 mt-0.5">Manage student accounts and monitor progress.</p>
        </div>
        <div className="text-sm text-gray-500">{filtered.length} students</div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-amber-400 transition-colors" />
        </div>
        <select value={career} onChange={(e) => setCareer(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none text-gray-700">
          <option value="All">All Careers</option>
          {["Software Engineer", "Data Scientist", "Full Stack Developer", "AI/ML Engineer", "Data Analyst", "Cloud Engineer"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none text-gray-700">
          <option value="All">All Status</option>
          {["Active", "Inactive", "Suspended"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Student detail panel */}
      {selected && (
        <div className="admin-card mb-5 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>{selected.name[0]}</div>
              <div>
                <h2 className="font-black text-gray-900 text-lg">{selected.name}</h2>
                <div className="text-sm text-gray-500">{selected.email}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: "College", value: selected.college },
              { label: "Target Role", value: selected.target },
              { label: "Readiness", value: `${selected.readiness}%` },
              { label: "Status", value: selected.status },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                <div className="font-semibold text-gray-900 text-sm">{value}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
            ⚠️ Admin view does not expose passwords or sensitive credentials. Student data shown is profile-level only.
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn-secondary text-xs px-4 py-2">View Roadmap</button>
            <button className="btn-secondary text-xs px-4 py-2">View Skills</button>
            <button className="btn-secondary text-xs px-4 py-2 text-red-600 border-red-200 hover:bg-red-50">Suspend Account</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="admin-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Name", "College", "Target Role", "Readiness", "Status", "Last Active", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.email} className="table-row border-b border-gray-50 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>{user.name[0]}</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.college}</td>
                <td className="px-4 py-3 text-sm text-gray-700 font-medium">{user.target}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-black ${readinessColor(user.readiness)}`}>{user.readiness}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={statusBadge(user.status)}>{user.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{user.last}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(user)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="View"><Eye size={14} /></button>
                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit"><Edit size={14} /></button>
                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Suspend"><Ban size={14} /></button>
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
