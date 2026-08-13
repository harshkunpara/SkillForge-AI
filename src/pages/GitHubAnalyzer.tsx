interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
}

interface GHUser {
  login: string;
  name: string | null;
  public_repos: number;
  followers: number;
  avatar_url: string;
}

const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f59e0b", TypeScript: "#3b82f6", Python: "#10b981", Java: "#ef4444",
  "C++": "#8b5cf6", Go: "#06b6d4", Rust: "#f97316", Ruby: "#e11d48",
};

function buildLanguages(repos: Repo[]) {
  const counts: Record<string, number> = {};
  for (const r of repos) if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, count]) => ({ name, percent: Math.round((count / total) * 100), color: LANG_COLORS[name] || "#94a3b8" }));
}

function buildScores(repos: Repo[]) {
  const withDesc = repos.filter((r) => r.description && r.description.length > 10).length;
  const documentation = Math.round((withDesc / Math.max(repos.length, 1)) * 100);
  const diversity = Math.min(100, buildLanguages(repos).length * 20);
  const recent = repos.filter((r) => Date.now() - new Date(r.updated_at).getTime() < 90 * 86400000).length;
  const activity = Math.min(100, Math.round((recent / Math.max(repos.length, 1)) * 100));
  const portfolio = Math.round((documentation + diversity + activity) / 3);
  return { documentation, diversity, activity, portfolio };
}

function buildRecs(repos: Repo[], scores: ReturnType<typeof buildScores>) {
  const recs = [];
  if (scores.documentation < 60) recs.push({ icon: "📝", title: "Improve README files", desc: "Several repos have minimal descriptions. Add setup, screenshots, and usage examples.", priority: "High" });
  if (repos.length < 6) recs.push({ icon: "📁", title: "Add more projects", desc: "More repos demonstrate breadth. Aim for at least 6-8 meaningful projects.", priority: "High" });
  if (scores.diversity < 40) recs.push({ icon: "💻", title: "Diversify tech stack", desc: "Multiple languages show versatility to recruiters.", priority: "Medium" });
  if (scores.activity < 50) recs.push({ icon: "⚡", title: "Stay active", desc: "Recent commits signal engagement. Push code at least weekly.", priority: "Medium" });
  recs.push({ icon: "🌐", title: "Deploy your projects", desc: "Live demos are instantly accessible to recruiters.", priority: "Low" });
  return recs;
}

export default function GitHubAnalyzer() {
  const { user, profile, updateProfile } = useAuth();
  const [username, setUsername] = useState(profile?.github_username || "");
  const [state, setState] = useState<"empty" | "loading" | "results">("empty");
  const [ghUser, setGhUser] = useState<GHUser | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const languages = buildLanguages(repos);
  const scores = buildScores(repos);
  const recs = buildRecs(repos, scores);

  const analyze = async (uname?: string) => {
    const name = (uname ?? username).trim();
    if (!name) return;
    setState("loading");
    setError(null);
    try {
      const [uRes, rRes] = await Promise.all([
        fetch("https://api.github.com/users/" + name),
        fetch("https://api.github.com/users/" + name + "/repos?per_page=30&sort=updated"),
      ]);
      if (!uRes.ok) throw new Error(uRes.status === 404 ? "GitHub user not found" : "GitHub API error");
      const uJson = await uRes.json();
      const rJson: Repo[] = await rRes.json();
      setGhUser(uJson);
      setRepos(rJson);
      if (user) {
        await updateProfile({ github_username: name });
        await supabase.from("activity_log").insert({
          user_id: user.id, type: "github_analyzed",
          description: "GitHub profile analyzed: " + name + " (" + uJson.public_repos + " repos)",
        });
      }
      setState("results");
    } catch (e) {
      setError(String(e));
      setState("empty");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">GitHub Portfolio Analyzer</h1>
        <p className="text-slate-500 mt-1">Analyze your GitHub for code diversity, activity, and portfolio strength.</p>
      </div>

      {state === "empty" && (
        <div className="max-w-lg mx-auto">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
              <GitBranch size={28} className="text-white" />
            </div>
            <h2 className="font-bold text-slate-900 text-lg mb-2">Analyze Your GitHub</h2>
            <p className="text-sm text-slate-500 mb-6">Connect your GitHub profile to get portfolio analysis and improvement recommendations.</p>
            {error && <div className="text-sm text-red-500 mb-4 p-3 rounded-lg bg-red-50">{error}</div>}
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">github.com/</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="your-username"
                className="w-full pl-28 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 transition-colors" />
            </div>
            <button onClick={() => analyze()} disabled={!username.trim()} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
              <Sparkles size={15} /> Analyze Portfolio
            </button>
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className="max-w-sm mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <GitBranch size={28} className="text-white animate-pulse" />
          </div>
          <div className="font-bold text-slate-900 mb-1">Analyzing github.com/{username}...</div>
          <div className="text-sm text-slate-400 mb-6">Fetching repositories and calculating scores</div>
          <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto" />
        </div>
      )}

      {state === "results" && ghUser && (
        <div className="animate-fade-in">
          <div className="card p-5 mb-5 flex items-center gap-4">
            <img src={ghUser.avatar_url} alt={ghUser.login} className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <div className="font-bold text-slate-900">{ghUser.name || ghUser.login}</div>
              <div className="text-sm text-slate-400">github.com/{ghUser.login} · {ghUser.public_repos} repositories · {ghUser.followers} followers</div>
            </div>
            <a href={"https://github.com/" + ghUser.login} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <ExternalLink size={12} /> View Profile
            </a>
            <button onClick={() => setState("empty")} className="text-xs text-indigo-600 font-semibold">Analyze Another</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: "Repositories", value: ghUser.public_repos, icon: "📁" },
              { label: "Languages", value: languages.length, icon: "💻" },
              { label: "Portfolio Score", value: scores.portfolio + "%", icon: "⭐" },
              { label: "Followers", value: ghUser.followers, icon: "👥" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="card p-4 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-3xl font-black text-slate-900">{value}</div>
                <div className="text-xs text-slate-400 font-medium">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <div className="card p-5">
              <h3 className="font-bold text-slate-900 mb-4">Portfolio Scores</h3>
              <div className="space-y-4">
                {[
                  { label: "Documentation", value: scores.documentation, color: "#f59e0b" },
                  { label: "Tech Diversity", value: scores.diversity, color: "#3b82f6" },
                  { label: "Activity", value: scores.activity, color: "#4f46e5" },
                  { label: "Portfolio Strength", value: scores.portfolio, color: "#10b981" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="font-bold" style={{ color }}>{value}%</span>
                    </div>
                    <div className="skill-bar-track">
                      <div className="skill-bar-fill" style={{ width: `${value}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-900 mb-4">Language Distribution</h3>
              <div className="space-y-3">
                {languages.map(({ name, percent, color }) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">{name}</span><span>{percent}%</span>
                    </div>
                    <div className="skill-bar-track">
                      <div className="skill-bar-fill" style={{ width: `${percent}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-slate-900 mb-4">Recent Repositories</h3>
              <div className="space-y-3">
                {repos.slice(0, 4).map((r) => (
                  <a key={r.name} href={r.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Code size={13} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.language || "—"}</div>
                    </div>
                    <div className="text-xs text-amber-600">⭐ {r.stargazers_count}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-indigo-500" />
              <h3 className="font-bold text-slate-900">Improvement Recommendations</h3>
            </div>
            <div className="space-y-3">
              {recs.map(({ icon, title, desc, priority }) => (
                <div key={title} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-shrink-0">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-slate-900 text-sm">{title}</span>
                      <span className={priority === "High" ? "badge-red" : priority === "Medium" ? "badge-yellow" : "badge-blue"}>{priority}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
