import { useState, useRef } from "react";
import { Upload, Sparkles, Check, FileText, ChevronRight, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { supabase, callEdgeFunction } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function ImprovementsTab({ improvements }: { improvements: Array<{ priority: string; issue: string; suggestion: string }> }) {
  return (
    <div className="space-y-4">
      {improvements.map(({ priority, issue, suggestion }, idx) => {
        const isHigh = priority === "high";
        const isMed = priority === "medium";
        const bg = isHigh ? "#ef444422" : isMed ? "#f59e0b22" : "#3b82f622";
        const iconColor = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#3b82f6";
        const badgeCls = isHigh ? "bg-red-100 text-red-700" : isMed ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
        return (
          <div key={idx} className="card p-5 flex gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <AlertCircle size={18} style={{ color: iconColor }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-900 text-sm">{issue}</span>
                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full capitalize " + badgeCls}>{priority}</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{suggestion}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PROCESSING = [
  "Reading document",
  "Extracting skills",
  "Analyzing projects",
  "Detecting experience",
  "Building skill profile",
];

interface AnalysisResult {
  score: number;
  skills_detected: Array<{ name: string; level: string; confidence: number; evidence: string }>;
  sections: Record<string, { score: number; feedback: string }>;
  improvements: Array<{ priority: string; issue: string; suggestion: string }>;
}

export default function ResumeAnalyzer() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<"empty" | "uploading" | "processing" | "results">("empty");
  const [processStep, setProcessStep] = useState(0);
  const [activeTab, setActiveTab] = useState("skills");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = async (file?: File) => {
    const f = file || selectedFile;
    setError(null);

    if (!f) {
      setError("Please choose a resume file to analyze.");
      return;
    }
    if (!user) {
      setError("Please sign in to analyze your resume.");
      return;
    }

    setState("uploading");
    try {
      // Upload to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${f.name}`;
      const { error: uploadErr } = await supabase.storage.from("resumes").upload(filePath, f);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(filePath);

      // Read text from file for AI analysis
      const text = await f.text();

      setState("processing");
      let s = 0;
      const interval = setInterval(() => {
        s++;
        setProcessStep(s);
        if (s >= PROCESSING.length) clearInterval(interval);
      }, 600);

      const result = await callEdgeFunction<AnalysisResult>("analyze-resume", {
        resumeText: text,
        resumeUrl: publicUrl,
        targetCareer: profile?.target_career || "Software Engineer",
      });

      clearInterval(interval);
      setProcessStep(PROCESSING.length);
      setAnalysisResult(result);
      setTimeout(() => setState("results"), 400);
    } catch (err) {
      setError(String(err));
      setState("empty");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); startAnalysis(f); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">AI Resume Analyzer</h1>
        <p className="text-slate-500 mt-1">Upload your resume and let AI extract your complete skill profile.</p>
      </div>

      {error && <div className="max-w-lg mx-auto mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {/* Empty state */}
      {state === "empty" && (
        <div className="max-w-lg mx-auto">
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileChange} />
          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, #eef2ff, #f5f3ff)" }}>
              <Upload size={28} className="text-indigo-500" />
            </div>
            <div className="font-bold text-slate-900 text-lg mb-2">Drag & Drop Resume PDF</div>
            <div className="text-sm text-slate-400 mb-6">Supports PDF, DOCX, TXT — Max 5MB</div>
            <button className="btn-primary px-8 py-3" onClick={(e) => { e.stopPropagation(); startAnalysis(); }}>
              <Upload size={15} /> Demo Analysis
            </button>
            <div className="mt-4 text-xs text-slate-400">Your resume is processed securely and never shared.</div>
          </div>
        </div>
      )}

      {/* Uploading */}
      {state === "uploading" && (
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <FileText size={24} className="text-white" />
          </div>
          <div className="font-bold text-slate-900 mb-1">Uploading Resume...</div>
          <div className="text-sm text-slate-500">{selectedFile?.name || "Resume"}</div>
          <div className="w-48 h-1.5 rounded-full bg-slate-100 mx-auto mt-4 overflow-hidden">
            <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }} />
          </div>
        </div>
      )}

      {/* Processing */}
      {state === "processing" && (
        <div className="max-w-sm mx-auto py-12">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="font-bold text-slate-900">Analyzing Resume...</div>
            <div className="text-sm text-slate-400 mt-1">AI is reading your profile</div>
          </div>
          <div className="space-y-3">
            {PROCESSING.map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: i < processStep ? "#f0fdf4" : i === processStep ? "#eef2ff" : "#f8fafc" }}>
                <div className="flex-shrink-0">
                  {i < processStep ? <CheckCircle size={18} className="text-emerald-500" /> :
                    i === processStep ? (
                      <div className="w-4.5 h-4.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin w-[18px] h-[18px]" />
                    ) : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-200" />}
                </div>
                <span className={`text-sm font-medium ${i < processStep ? "text-emerald-700" : i === processStep ? "text-indigo-700" : "text-slate-400"}`}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {state === "results" && (
        <div className="animate-fade-in">
          {/* Score card */}
          <div className="card p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  <span className="text-white text-3xl font-black">{analysisResult?.score ?? 0}</span>
                  <span className="text-indigo-200 text-xs">/ 100</span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-0.5">Resume Score</div>
                  <div className="text-2xl font-black text-slate-900">{(analysisResult?.score ?? 0) >= 80 ? "Strong" : (analysisResult?.score ?? 0) >= 60 ? "Good" : "Needs Work"}</div>
                  <div className="text-sm text-slate-500">Above average for your target role</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {[`Skills Detected: ${analysisResult?.skills_detected?.length ?? 0}`, `Sections: ${Object.keys(analysisResult?.sections ?? {}).length}`, `Improvements: ${analysisResult?.improvements?.length ?? 0}`].map((item) => (
                  <span key={item} className="badge-blue">{item}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
            {["skills", "sections", "improvements"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Skills tab */}
          {activeTab === "skills" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analysisResult?.skills_detected || []).map(({ name, level, confidence, evidence }) => (
                <div key={name} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-slate-900 text-base">{name}</div>
                      <div className={`text-xs font-semibold mt-0.5 ${level === "advanced" ? "text-emerald-600" : level === "intermediate" ? "text-blue-600" : "text-amber-600"}`}>{level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{confidence}%</div>
                      <div className="text-[10px] text-slate-400">confidence</div>
                    </div>
                  </div>
                  <div className="skill-bar-track mb-3">
                    <div className="skill-bar-fill" style={{ width: `${confidence}%`, background: confidence >= 75 ? "#10b981" : confidence >= 55 ? "#f59e0b" : "#f87171" }} />
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed mb-3 italic">"{evidence}"</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confidence >= 75 ? "bg-emerald-100 text-emerald-700" : confidence >= 55 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {confidence >= 75 ? "✓ Strong" : confidence >= 55 ? "⚡ Verify Now" : "⚠ Gap Detected"}
                    </span>
                    {confidence < 75 && (
                      <button className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
                        Take Assessment <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sections tab */}
          {activeTab === "sections" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(analysisResult?.sections || {}).map(([title, { score, feedback }]) => (
                <div key={title} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-slate-400" />
                      <h3 className="font-bold text-slate-900 capitalize">{title}</h3>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{score}/100</span>
                  </div>
                  <div className="skill-bar-track mb-3">
                    <div className="skill-bar-fill" style={{ width: `${score}%`, background: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f87171" }} />
                  </div>
                  <p className="text-sm text-slate-500">{feedback}</p>
                </div>
              ))}
            </div>
          )}

          {/* Improvements tab */}
          {activeTab === "improvements" && (
            <ImprovementsTab improvements={analysisResult?.improvements || []} />
          )}
        </div>
      )}
    </div>
  );
}
