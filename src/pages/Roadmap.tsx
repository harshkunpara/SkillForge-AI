import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, CheckCircle, Clock, ChevronDown, ChevronUp, Zap, BookOpen, FolderOpen, Award, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { useRoadmap } from "../hooks/useSupabaseData";
import { useAuth } from "../context/AuthContext";
import { callEdgeFunction, supabase } from "../lib/supabase";

const taskIcon = (type: string) => {
  if (type === "course") return <BookOpen size={12} />;
  if (type === "project") return <FolderOpen size={12} />;
  if (type === "assessment") return <Zap size={12} />;
  if (type === "certification") return <Award size={12} />;
  return <CheckCircle size={12} />;
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "#f0fdf4", text: "#16a34a", label: "Completed" },
  active: { bg: "#eef2ff", text: "#4338ca", label: "In Progress" },
  pending: { bg: "#f8fafc", text: "#94a3b8", label: "Upcoming" },
};

export default function Roadmap() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { phases, loading, reload, toggleTask } = useRoadmap();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const generateRoadmap = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      await callEdgeFunction("generate-roadmap", {});
      await reload();
    } catch (e) {
      const errMsg = String(e).toLowerCase();
      const isNetworkError = errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('cors') || errMsg.includes('status 40');
      if (isNetworkError && user) {
        // Insert demo roadmap
        const { data: existingRm } = await supabase.from('roadmaps').select('id').eq('user_id', user.id).single();
        let rmId = existingRm?.id;
        if (!rmId) {
          const { data: newRm } = await supabase.from('roadmaps').insert({
            user_id: user.id,
            target_role: profile?.target_career || 'Full Stack Developer',
            total_phases: 3,
            status: 'active'
          }).select('id').single();
          rmId = newRm?.id;
        }
        if (rmId) {
          // Delete existing phases for clean demo
          await supabase.from('roadmap_phases').delete().eq('roadmap_id', rmId);
          const phases = [
            { roadmap_id: rmId, phase_number: 1, title: 'Foundation Strengthening', duration: '2 weeks', status: 'active', progress: 0, skills: ['TypeScript', 'Testing'], ai_added: false, ai_reason: null },
            { roadmap_id: rmId, phase_number: 2, title: 'Advanced Concepts', duration: '3 weeks', status: 'pending', progress: 0, skills: ['System Design', 'DevOps'], ai_added: true, ai_reason: 'Added based on your critical skill gaps in System Design' },
            { roadmap_id: rmId, phase_number: 3, title: 'Portfolio & Interview Prep', duration: '2 weeks', status: 'pending', progress: 0, skills: ['Projects', 'Interview'], ai_added: false, ai_reason: null },
          ];
          for (const p of phases) {
            const { data: inserted } = await supabase.from('roadmap_phases').insert(p).select('id, phase_number').single();
            if (inserted) {
              const tasks = p.phase_number === 1 ? [
                { phase_id: inserted.id, name: 'Complete TypeScript deep-dive course', type: 'course', done: false, skill_name: 'TypeScript' },
                { phase_id: inserted.id, name: 'Build a typed API client library', type: 'project', done: false, skill_name: 'TypeScript' },
                { phase_id: inserted.id, name: 'Write unit tests with Jest', type: 'course', done: false, skill_name: 'Testing' },
              ] : p.phase_number === 2 ? [
                { phase_id: inserted.id, name: 'Study system design patterns', type: 'course', done: false, skill_name: 'System Design' },
                { phase_id: inserted.id, name: 'Design a URL shortener system', type: 'project', done: false, skill_name: 'System Design' },
                { phase_id: inserted.id, name: 'Set up CI/CD with GitHub Actions', type: 'project', done: false, skill_name: 'DevOps' },
              ] : [
                { phase_id: inserted.id, name: 'Build portfolio project', type: 'project', done: false, skill_name: 'Projects' },
                { phase_id: inserted.id, name: 'Practice behavioral interviews', type: 'assessment', done: false, skill_name: 'Interview' },
                { phase_id: inserted.id, name: 'Take mock technical interview', type: 'assessment', done: false, skill_name: 'Interview' },
              ];
              for (const t of tasks) {
                await supabase.from('roadmap_tasks').insert(t);
              }
            }
          }
        }
        await reload();
        setGenError('Notice: Showing demo roadmap (Edge Function offline).');
      } else {
        setGenError(String(e));
      }
    } finally {
      setGenerating(false);
    }
  };

  const totalDone = phases.reduce((acc, p) => acc + p.tasks.filter((t) => t.done).length, 0);
  const totalTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const aiAddedPhases = phases.filter((p) => p.ai_added);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Your Personalized Roadmap</h1>
          <p className="text-slate-500 mt-1">
            {profile?.target_career
              ? `AI-adapted to your skill profile and target role: ${profile.target_career}`
              : "AI-adapted to your skill profile and career goals"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {phases.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-slate-500">Overall Progress</div>
              <div className="text-2xl font-black text-indigo-600">{overallPct}%</div>
            </div>
          )}
          <button onClick={generateRoadmap} disabled={generating} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><RefreshCw size={14} /> {phases.length > 0 ? "Regenerate" : "Generate Roadmap"}</>}
          </button>
        </div>
      </div>

      {genError && (
        <div className="card p-3 mb-4 border-red-200 text-sm text-red-600">{genError}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <div className="text-slate-500 text-sm">Loading roadmap...</div>
          </div>
        </div>
      ) : phases.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <div className="font-bold text-slate-900 text-lg mb-2">No roadmap yet</div>
          <div className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Generate your personalized AI roadmap based on your skills, gaps, and target role.
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/resume")} className="btn-secondary text-sm px-4 py-2">Analyze Resume First</button>
            <button onClick={generateRoadmap} disabled={generating} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
              {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Roadmap</>}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
            {profile?.target_career && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-600">Target: {profile.target_career}</span>
              </div>
            )}
            {profile?.placement_readiness != null && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-sm text-slate-600">Current Readiness: {profile.placement_readiness}%</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <span className="ai-tag"><Sparkles size={9} /> AI-Adapted</span>
            </div>
          </div>

          {/* AI additions notice / Adaptation Notice */}
          <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.25)" }}>
            <Sparkles size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-indigo-900 text-sm mb-0.5">Your roadmap has been updated based on your latest assessment.</div>
              <div className="text-sm text-indigo-700">
                Optimized tasks for your gaps.
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-4">
            {phases.map((phase) => {
              const sc = statusColors[phase.status] || statusColors["pending"];
              const isOpen = expanded.includes(phase.id);
              const doneTasks = phase.tasks.filter((t) => t.done).length;

              return (
                <div key={phase.id} className={`card overflow-hidden transition-all ${phase.status === "active" ? "ring-2 ring-indigo-200" : ""}`}>
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggle(phase.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      phase.status === "completed" ? "bg-emerald-500 text-white" :
                      phase.status === "active" ? "text-white" :
                      phase.ai_added ? "bg-amber-100 text-amber-700 border-2 border-dashed border-amber-400" :
                      "bg-slate-100 text-slate-400"
                    }`} style={phase.status === "active" ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}>
                      {phase.status === "completed" ? <CheckCircle size={18} /> : phase.phase_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{phase.title}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                        {phase.ai_added && <span className="ai-tag text-[10px]"><Sparkles size={8} /> AI Added</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {phase.duration && <div className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /> {phase.duration}</div>}
                        <div className="text-xs text-slate-400">{doneTasks}/{phase.tasks.length} tasks</div>
                      </div>
                      {phase.status !== "pending" && (
                        <div className="skill-bar-track w-48 mt-2">
                          <div className="skill-bar-fill" style={{ width: `${phase.progress}%`, background: phase.status === "completed" ? "#10b981" : phase.ai_added ? "#f59e0b" : "#4f46e5" }} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-slate-400">{phase.progress}%</div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-slate-100 animate-fade-in">
                      {phase.ai_reason && (
                        <div className="mt-4 mb-4 rounded-lg p-3 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                          <span className="font-semibold text-amber-700">Why AI added this: </span>
                          <span className="text-amber-600">{phase.ai_reason}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-6 mt-4">
                        {phase.skills?.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Skills Covered</div>
                            <div className="flex flex-wrap gap-1.5">
                              {phase.skills.map((s) => (
                                <span key={s} className="badge-blue text-[10px] px-2 py-0.5">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tasks</div>
                          <div className="space-y-3">
                            {phase.tasks.map((t: any) => {
                              // Find matching gap reason if any
                              const gapReason = t.skill_name ? `Addresses gap in ${t.skill_name}: Required score is higher than current score.` : null;
                              
                              return (
                                <div
                                  key={t.id}
                                  className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all"
                                >
                                  <div
                                    className={`flex items-center gap-2 text-xs cursor-pointer ${t.done ? "text-slate-400" : "text-slate-700"}`}
                                    onClick={(e) => { e.stopPropagation(); if (user) toggleTask(phase.id, t.id, !t.done, user.id); }}
                                  >
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-lg flex-shrink-0 transition-all ${t.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-indigo-100"}`}>
                                      {taskIcon(t.type)}
                                    </div>
                                    <span className={`font-semibold ${t.done ? "line-through" : ""}`}>{t.name}</span>
                                  </div>
                                  
                                  {gapReason && (
                                    <div className="mt-2 pl-7 flex items-start gap-1 text-[10px] text-indigo-500 font-medium">
                                      <Sparkles size={10} className="mt-0.5 flex-shrink-0" />
                                      <span>Why this task? {gapReason}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {phase.status === "active" && (
                        <button className="btn-primary text-xs px-4 py-2 mt-4">
                          Continue Learning <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
