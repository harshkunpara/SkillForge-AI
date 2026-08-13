import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, ChevronLeft, Check, Upload, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const STEPS = ["Personal", "Education", "Skills", "Experience", "Career Goal", "Companies", "GitHub", "Resume"];
const CAREERS = ["Software Engineer", "Full Stack Developer", "AI/ML Engineer", "Data Analyst", "Data Scientist", "Cybersecurity", "Cloud Engineer", "Other"];
const SKILL_OPTIONS = ["Java", "C++", "Python", "JavaScript", "React", "Node.js", "SQL", "MongoDB", "Git", "Docker", "AWS", "DSA", "System Design", "OOP", "DBMS", "Machine Learning"];
const COMPANIES = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Flipkart", "Paytm", "Swiggy", "Zomato", "Infosys", "TCS", "Wipro", "Startup"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("B.Tech");
  const [year, setYear] = useState("3rd Year");
  const [branch, setBranch] = useState("Computer Science");
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [career, setCareer] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [github, setGithub] = useState("");
  const [resumeUploaded, setResumeUploaded] = useState(false);

  const toggleSkill = (s: string) => setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleCompany = (c: string) => setCompanies((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return college.trim().length > 0;
    if (step === 3) return experience.length > 0;
    if (step === 4) return career.length > 0;
    return true;
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all";
  const selectCls = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #f8fafc, #eef2ff)" }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)" }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <span className="text-white font-bold text-xs">SF</span>
            </div>
            <span className="text-white font-bold text-sm">SkillForge AI</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${i < step ? "bg-emerald-400" : i === step ? "bg-indigo-400" : "bg-white/15"}`} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold text-sm">Step {step + 1} of {STEPS.length}</div>
              <div className="text-slate-400 text-xs">{STEPS[step]}</div>
            </div>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < step ? "bg-emerald-400" : i === step ? "bg-indigo-400" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 min-h-64">
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">What's your name?</h2>
              <p className="text-slate-500 text-sm mb-6">Let's personalize your experience.</p>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Harsh Patel" className={inputCls} autoFocus />
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Your Education</h2>
              <p className="text-slate-500 text-sm mb-6">We'll tailor your roadmap to your background.</p>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">College / University</label>
                <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="VIT Vellore" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Degree</label>
                  <select value={degree} onChange={(e) => setDegree(e.target.value)} className={selectCls}>
                    {["B.Tech", "B.E.", "B.Sc", "M.Tech", "MCA", "BCA"].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
                    {["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year"].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Branch</label>
                <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectCls}>
                  {["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Chemical"].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Current Skills</h2>
              <p className="text-slate-500 text-sm mb-5">Select all that apply. We'll verify these later.</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSkill(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${skills.includes(s) ? "text-white border-indigo-500" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"}`}
                    style={skills.includes(s) ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
                  >
                    {skills.includes(s) && <Check size={12} className="inline mr-1" />}
                    {s}
                  </button>
                ))}
              </div>
              {skills.length > 0 && <p className="text-xs text-indigo-600 font-medium mt-3">{skills.length} skills selected</p>}
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Experience Level</h2>
              <p className="text-slate-500 text-sm mb-6">This helps calibrate your roadmap difficulty.</p>
              <div className="space-y-3">
                {[
                  { level: "Beginner", desc: "Just started learning to code, less than 6 months." },
                  { level: "Intermediate", desc: "Built projects, comfortable with at least 1-2 languages." },
                  { level: "Advanced", desc: "Strong DSA, multiple full-stack projects, internship experience." },
                ].map(({ level, desc }) => (
                  <button
                    key={level}
                    onClick={() => setExperience(level)}
                    className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${experience === level ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${experience === level ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}>
                        {experience === level && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{level}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Target Career</h2>
              <p className="text-slate-500 text-sm mb-5">Where do you want to go?</p>
              <div className="grid grid-cols-2 gap-2">
                {CAREERS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCareer(c)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${career === c ? "border-indigo-500 text-white" : "border-slate-200 text-slate-700 hover:border-slate-300 bg-slate-50"}`}
                    style={career === c ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
                  >
                    {career === c && <Check size={12} className="inline mr-1" />}
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Target Companies</h2>
              <p className="text-slate-500 text-sm mb-5">Optional. We'll use this to tailor your preparation.</p>
              <div className="flex flex-wrap gap-2">
                {COMPANIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCompany(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${companies.includes(c) ? "text-white border-indigo-500" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"}`}
                    style={companies.includes(c) ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">GitHub Profile</h2>
              <p className="text-slate-500 text-sm mb-6">Optional. We'll analyze your portfolio for strengths and gaps.</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">github.com/</span>
                <input type="text" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="your-username" className={`${inputCls} pl-28`} />
              </div>
              <p className="text-xs text-slate-400 mt-3">You can connect this later from your dashboard.</p>
            </div>
          )}

          {step === 7 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Upload Resume</h2>
              <p className="text-slate-500 text-sm mb-6">Optional but recommended. AI will extract your full skill profile.</p>
              {!resumeUploaded ? (
                <div
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                  onClick={() => setResumeUploaded(true)}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Upload size={20} className="text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-700 mb-1">Drag & Drop Resume PDF</div>
                  <div className="text-xs text-slate-400 mb-4">or click to browse</div>
                  <button className="btn-primary text-sm px-5 py-2">
                    <Upload size={14} /> Choose File
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Check size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">Harsh_Patel_Resume.pdf</div>
                    <div className="text-xs text-slate-500">124 KB • Ready to analyze</div>
                  </div>
                  <button onClick={() => setResumeUploaded(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate("/register")}
            className="btn-secondary px-5 py-2.5"
          >
            <ChevronLeft size={15} /> {step === 0 ? "Back" : "Previous"}
          </button>

          <button
            onClick={async () => {
              if (step < STEPS.length - 1) {
                setStep(step + 1);
              } else {
                setSaving(true);
                await updateProfile({
                  full_name: name,
                  college,
                  degree,
                  year,
                  branch,
                  experience_level: experience,
                  target_career: career,
                  target_companies: companies,
                  github_username: github || null,
                  onboarding_complete: true,
                  placement_readiness: 0,
                });
                setSaving(false);
                navigate("/dashboard");
              }
            }}
            disabled={!canNext() || saving}
            className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {saving ? "Saving..." : step === STEPS.length - 1 ? "Build My Roadmap" : "Continue"} <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
