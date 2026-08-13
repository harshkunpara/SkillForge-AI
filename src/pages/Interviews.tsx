import { useState, useEffect, useRef } from "react";
import { Mic, Clock, Sparkles, CheckCircle, AlertTriangle, ArrowRight, BarChart2, Play, RotateCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { callEdgeFunction, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const MODES = ["Technical", "DSA", "Java", "SQL", "Project", "HR", "Behavioral"];

const FALLBACK_QUESTIONS = [
  "Explain the difference between HashMap and TreeMap in Java. When would you use one over the other?",
  "Write a function to find the middle element of a linked list in a single traversal.",
  "What is database normalization? Explain 1NF, 2NF, and 3NF with examples.",
  "Describe a challenging technical problem you solved in a project. Walk me through your approach.",
  "What is the time complexity of QuickSort in the worst case? How can it be avoided?",
];

export default function Interviews() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"setup" | "interview" | "result" | "history">("setup");
  const [selectedMode, setSelectedMode] = useState("Technical");
  const [difficulty, setDifficulty] = useState("Medium");
  const [qIndex, setQIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>(FALLBACK_QUESTIONS);
  const [answers, setAnswers] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [timer, setTimer] = useState(90);
  const [loadingQs, setLoadingQs] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<{ scores: number[]; overall_score: number; question_feedback: Array<{question: string; score: number; what_did_well: string; what_missed: string}>; weak_areas: string[]; strengths: string[]; overall_feedback: string } | null>(null);
  const [historyData, setHistoryData] = useState<{ session: string; score: number; date: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode === "interview") {
      timerRef.current = setInterval(() => setTimer((t) => t > 0 ? t - 1 : 0), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, qIndex]);

  useEffect(() => {
    if (user) {
      supabase.from("interview_sessions").select("overall_score,created_at").eq("user_id", user.id).order("created_at").then(({ data }) => {
        if (data) {
          setHistoryData(data.map((d, i) => ({ session: "Interview " + (i + 1), score: d.overall_score, date: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) })));
        }
      });
    }
  }, [user]);

  const startInterview = async () => {
    setLoadingQs(true);
    setQIndex(0);
    setAnswer("");
    setAnswers([]);
    setTimer(90);
    setAiResult(null);
    try {
      const res = await callEdgeFunction<{ questions: string[] }>("generate-questions", {
        mode: selectedMode.toLowerCase(),
        difficulty: difficulty.toLowerCase(),
        count: 5,
      });
      setQuestions(res.questions?.length ? res.questions : FALLBACK_QUESTIONS);
    } catch {
      setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setLoadingQs(false);
      setMode("interview");
    }
  };

  const submitAnswer = async () => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
      setAnswer("");
      setTimer(90);
    } else {
      setEvaluating(true);
      setMode("result");
      try {
        const result = await callEdgeFunction<typeof aiResult>("evaluate-interview", {
          questions,
          answers: newAnswers,
          mode: selectedMode,
          difficulty: difficulty.toLowerCase(),
        });
        setAiResult(result);
      } catch {
        setAiResult(null);
      }
      setEvaluating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">AI Interview Coach</h1>
          <p className="text-slate-500 mt-1">Practice technical and behavioral interviews with AI feedback.</p>
        </div>
        <button onClick={() => setMode(mode === "history" ? "setup" : "history")} className="btn-secondary text-sm px-4 py-2">
          <BarChart2 size={14} /> {mode === "history" ? "Start Interview" : "View History"}
        </button>
      </div>

      {/* Setup */}
      {mode === "setup" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-6">
            <h2 className="font-bold text-slate-900 mb-4">Configure Interview</h2>

            <div className="mb-5">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Interview Type</label>
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <button key={m} onClick={() => setSelectedMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedMode === m ? "text-white border-indigo-500" : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"}`}
                    style={selectedMode === m ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Difficulty</label>
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard"].map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${difficulty === d ? "text-white border-transparent" : "border-slate-200 text-slate-600 bg-white"}`}
                    style={difficulty === d ? { background: d === "Easy" ? "#10b981" : d === "Medium" ? "#f59e0b" : "#ef4444" } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Duration</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-400">
                <option>15 minutes (5 questions)</option>
                <option>30 minutes (10 questions)</option>
                <option>45 minutes (15 questions)</option>
              </select>
            </div>

            <button onClick={startInterview} disabled={loadingQs} className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60">
              {loadingQs ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating Questions...</> : <><Play size={16} /> Start Interview</>}
            </button>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-4">Recent Performance</h3>
            <div className="space-y-3 mb-5">
              {historyData.map(({ session, score, date }) => (
                <div key={session} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    {score}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{session}</div>
                    <div className="text-xs text-slate-400">{date}</div>
                  </div>
                  <div className={`text-xs font-semibold ${score >= 75 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500"}`}>
                    {score}%
                  </div>
                </div>
              ))}
            </div>
            {historyData.length > 1 && (
              <div className="rounded-xl p-3 mt-4" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
                <div className="text-sm font-semibold text-emerald-800 mb-1">Keep it up! 🎉</div>
                <div className="text-xs text-emerald-700">
                  {historyData.length} interview sessions completed. Score: {historyData[0].score}% → {historyData[historyData.length - 1].score}%
                </div>
              </div>
            )}
            {historyData.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">No interview history yet. Start your first session!</div>
            )}
          </div>
        </div>
      )}

      {/* Interview */}
      {mode === "interview" && (
        <div className="animate-fade-in">
          <div className="card p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  <Mic size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">AI Interviewer</div>
                  <div className="text-xs text-slate-400">{selectedMode} · {difficulty}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
                  <Clock size={13} className="text-red-500" />
                  <span className="text-sm font-bold text-red-600">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</span>
                </div>
                <div className="text-xs text-slate-400">Q{qIndex + 1}/{questions.length}</div>
              </div>
            </div>

            <div className="rounded-xl p-5 mb-4" style={{ background: "#0f172a" }}>
              <div className="text-xs text-indigo-400 font-medium mb-2">Question {qIndex + 1}</div>
              <div className="text-white font-medium leading-relaxed">{questions[qIndex]}</div>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here... Be specific and think out loud."
              rows={6}
              className="w-full px-4 py-3 text-sm text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-none font-mono"
            />

            <div className="flex justify-between mt-3">
              <button onClick={() => setMode("setup")} className="btn-secondary text-sm px-4 py-2">End Interview</button>
              <button onClick={submitAnswer} disabled={!answer.trim()} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                Submit Answer <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 justify-center">
            {questions.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < qIndex ? "bg-emerald-500" : i === qIndex ? "bg-indigo-500 scale-125" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {mode === "result" && (
        <div className="animate-fade-in">
          <div className="card p-6 mb-5">
            <div className="flex items-center gap-3 mb-5">
              <Sparkles size={20} className="text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-900">Interview Feedback</h2>
            </div>

            {evaluating && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <div className="text-sm text-slate-500">AI is evaluating your answers...</div>
              </div>
            )}

            {!evaluating && aiResult && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Overall Score", value: aiResult.overall_score, color: "#10b981" },
                    { label: "Strengths", value: aiResult.strengths?.length ?? 0, color: "#4f46e5", suffix: "" },
                    { label: "Weak Areas", value: aiResult.weak_areas?.length ?? 0, color: "#f59e0b", suffix: "" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center p-4 rounded-xl" style={{ background: color + "18" }}>
                      <div className="text-3xl font-black mb-1" style={{ color }}>{value}</div>
                      <div className="text-xs text-slate-500 font-medium">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="p-4 rounded-xl bg-emerald-50">
                    <div className="font-semibold text-emerald-800 mb-2 text-sm flex items-center gap-1.5">
                      <CheckCircle size={14} /> Strengths
                    </div>
                    <ul className="space-y-1.5">
                      {(aiResult.strengths || []).map((w, i) => (
                        <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5"><span>•</span>{w}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50">
                    <div className="font-semibold text-red-800 mb-2 text-sm flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Weak Areas
                    </div>
                    <ul className="space-y-1.5">
                      {(aiResult.weak_areas || []).map((w, i) => (
                        <li key={i} className="text-xs text-red-700 flex items-start gap-1.5"><span>•</span>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl p-4 mb-4" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <div className="font-semibold text-amber-800 mb-1 text-sm">AI Summary</div>
                  <div className="text-sm text-amber-700">{aiResult.overall_feedback}</div>
                </div>
              </>
            )}

            {!evaluating && !aiResult && (
              <div className="text-center py-6 text-slate-500 text-sm">Results unavailable — check your connection</div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={startInterview} className="btn-primary text-sm px-5 py-2.5">
                <RotateCcw size={14} /> Practice Again
              </button>
              <button onClick={() => setMode("history")} className="btn-secondary text-sm px-5 py-2.5">
                View History <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {mode === "history" && (
        <div className="animate-fade-in">
          <div className="card p-6">
            <h2 className="font-bold text-slate-900 mb-5">Interview Performance History</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={HISTORY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: "#4f46e5", strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-center mt-2 text-sm text-emerald-600 font-semibold">You're improving! +15 points across 3 sessions</div>
          </div>
        </div>
      )}
    </div>
  );
}
