import { useState, useRef, useEffect } from "react";
import { User, Mail, Phone, MapPin, GraduationCap, Briefcase, Target, Clock, Camera, Save, Edit3, CheckCircle, Loader2, FileText, Award, FolderOpen, Zap, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface ResumeData {
  personal?: { name?: string; email?: string; phone?: string; location?: string };
  education?: { university?: string; degree?: string; branch?: string; graduation_year?: string; gpa?: string }[];
  experience?: { company?: string; role?: string; duration?: string; description?: string }[];
  projects?: { name?: string; description?: string; technologies?: string[]; role?: string; skills_demonstrated?: string[] }[];
  certifications?: { name?: string; provider?: string; date?: string; skills?: string[] }[];
  achievements?: string[];
  analyzed_at?: string;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-indigo-500" />
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, edit, onChange }: { label: string; value: string; edit: boolean; onChange?: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {edit && onChange ? (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 transition-colors" />
      ) : (
        <div className="text-sm text-slate-800 font-medium">{value || <span className="text-slate-400 italic">Not set</span>}</div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rd = profile?.resume_data as ResumeData | null;

  // Editable form state — mirrors profile fields
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    bio: "",
    college: "",
    degree: "",
    branch: "",
    year: "",
    graduation_year: "",
    target_career: "",
    target_company: "",
    career_goal: "",
    weekly_hours: "",
    experience_level: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: (profile as { phone?: string }).phone || "",
        bio: (profile as { bio?: string }).bio || "",
        college: profile.college || "",
        degree: profile.degree || "",
        branch: profile.branch || "",
        year: profile.year || "",
        graduation_year: (profile as { graduation_year?: string }).graduation_year || "",
        target_career: profile.target_career || "",
        target_company: (profile as { target_company?: string }).target_company || "",
        career_goal: (profile as { career_goal?: string }).career_goal || "",
        weekly_hours: String((profile as { weekly_hours?: number }).weekly_hours || ""),
        experience_level: profile.experience_level || "",
      });
    }
  }, [profile]);

  const f = (key: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [key]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name || null,
        phone: form.phone || null,
        bio: form.bio || null,
        college: form.college || null,
        degree: form.degree || null,
        branch: form.branch || null,
        year: form.year || null,
        graduation_year: form.graduation_year || null,
        target_career: form.target_career || null,
        target_company: form.target_company || null,
        career_goal: form.career_goal || null,
        weekly_hours: form.weekly_hours ? parseInt(form.weekly_hours) : null,
        experience_level: form.experience_level || null,
      } as Parameters<typeof updateProfile>[0]);
      setEditing(false);
      setSaveMsg("Profile saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = user.id + "/avatar." + ext;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl } as Parameters<typeof updateProfile>[0]);
      await refreshProfile();
    } catch (e) {
      console.error("Avatar upload error:", e);
    } finally {
      setAvatarUploading(false);
    }
  };

  const avatarUrl = (profile as { avatar_url?: string })?.avatar_url;
  const initials = (profile?.full_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Student Profile</h1>
          <p className="text-slate-500 mt-1">Your complete learning and career profile powered by real data.</p>
        </div>
        <div className="flex gap-2">
          {saveMsg && <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"><CheckCircle size={14} /> {saveMsg}</div>}
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm px-4 py-2">
              <Edit3 size={14} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Avatar + quick stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar */}
          <div className="card p-6 text-center">
            <div className="relative inline-block mb-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-black text-white shadow-lg" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow"
              >
                {avatarUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </div>
            <div className="font-bold text-slate-900 text-lg">{profile?.full_name || "Your Name"}</div>
            <div className="text-xs text-slate-400 mt-0.5">{user?.email}</div>
            {(profile as { phone?: string })?.phone && (
              <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1"><Phone size={10} /> {(profile as { phone?: string }).phone}</div>
            )}
            {profile?.college && (
              <div className="text-xs text-slate-500 mt-1">{profile.college}</div>
            )}
          </div>

          {/* Readiness card */}
          <div className="card p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Career Readiness</div>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-black text-indigo-600">{profile?.placement_readiness ?? 0}%</div>
              <div className="flex-1">
                <div className="skill-bar-track">
                  <div className="skill-bar-fill" style={{ width: `${profile?.placement_readiness ?? 0}%`, background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }} />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {(profile?.placement_readiness ?? 0) >= 80 ? "Job Ready" : (profile?.placement_readiness ?? 0) >= 60 ? "Almost Ready" : "Building Up"}
                </div>
              </div>
            </div>
            {profile?.resume_score != null && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Resume Score</span><span className="font-bold text-slate-700">{profile.resume_score}/100</span>
                </div>
                <div className="skill-bar-track">
                  <div className="skill-bar-fill" style={{ width: `${profile.resume_score}%`, background: "#10b981" }} />
                </div>
              </div>
            )}
          </div>

          {/* Achievements from resume */}
          {rd?.achievements && rd.achievements.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-amber-500" />
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Achievements</div>
              </div>
              <div className="space-y-2">
                {rd.achievements.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Main profile data */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info */}
          <Section title="Personal Information" icon={User}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" value={form.full_name} edit={editing} onChange={f("full_name")} />
              <Field label="Email" value={user?.email || ""} edit={false} />
              <Field label="Phone" value={form.phone} edit={editing} onChange={f("phone")} />
              <Field label="Experience Level" value={form.experience_level} edit={editing} onChange={f("experience_level")} />
              {editing ? (
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Bio</div>
                  <textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 resize-none" placeholder="Tell us about yourself..." />
                </div>
              ) : (
                (profile as { bio?: string })?.bio && (
                  <div className="col-span-2 text-sm text-slate-600 leading-relaxed">{(profile as { bio?: string }).bio}</div>
                )
              )}
            </div>
          </Section>

          {/* Education */}
          <Section title="Education" icon={GraduationCap}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="University / College" value={form.college} edit={editing} onChange={f("college")} />
              <Field label="Degree" value={form.degree} edit={editing} onChange={f("degree")} />
              <Field label="Branch / Major" value={form.branch} edit={editing} onChange={f("branch")} />
              <Field label="Current Year" value={form.year} edit={editing} onChange={f("year")} />
              <Field label="Graduation Year" value={form.graduation_year} edit={editing} onChange={f("graduation_year")} />
            </div>
            {/* Education from resume */}
            {rd?.education && rd.education.length > 0 && !editing && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">From Resume</div>
                {rd.education.map((edu, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 mb-2">
                    <div className="font-semibold text-slate-800 text-sm">{edu.university}</div>
                    <div className="text-xs text-slate-500">{[edu.degree, edu.branch].filter(Boolean).join(" · ")} {edu.graduation_year && "· " + edu.graduation_year}</div>
                    {edu.gpa && <div className="text-xs text-slate-400 mt-0.5">GPA/Score: {edu.gpa}</div>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Career */}
          <Section title="Career Goals" icon={Target}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Role" value={form.target_career} edit={editing} onChange={f("target_career")} />
              <Field label="Target Company" value={form.target_company} edit={editing} onChange={f("target_company")} />
              <Field label="Weekly Learning Hours" value={form.weekly_hours} edit={editing} onChange={f("weekly_hours")} />
              {editing ? (
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Career Goal</div>
                  <textarea value={form.career_goal} onChange={(e) => setForm((p) => ({ ...p, career_goal: e.target.value }))} rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 resize-none" placeholder="Describe your career goal..." />
                </div>
              ) : (
                (profile as { career_goal?: string })?.career_goal && (
                  <div className="col-span-2 text-sm text-slate-600 leading-relaxed">{(profile as { career_goal?: string }).career_goal}</div>
                )
              )}
            </div>
          </Section>

          {/* Experience from resume */}
          {rd?.experience && rd.experience.length > 0 && (
            <Section title="Work Experience" icon={Briefcase}>
              <div className="space-y-4">
                {rd.experience.map((exp, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="font-semibold text-slate-900">{exp.role}</div>
                        <div className="text-sm text-indigo-600 font-medium">{exp.company}</div>
                      </div>
                      {exp.duration && (
                        <div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} /> {exp.duration}</div>
                      )}
                    </div>
                    {exp.description && <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">{exp.description}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Projects from resume */}
          {rd?.projects && rd.projects.length > 0 && (
            <Section title="My Projects (from Resume)" icon={FolderOpen}>
              <div className="space-y-4">
                {rd.projects.map((proj, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-semibold text-slate-900 mb-1">{proj.name}</div>
                    {proj.description && <div className="text-xs text-slate-600 mb-2 leading-relaxed">{proj.description}</div>}
                    {proj.role && <div className="text-xs text-slate-500 mb-2"><span className="font-medium">Role:</span> {proj.role}</div>}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {proj.technologies.map((t) => <span key={t} className="badge-blue text-xs">{t}</span>)}
                      </div>
                    )}
                    {proj.skills_demonstrated && proj.skills_demonstrated.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {proj.skills_demonstrated.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{s}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Certifications from resume */}
          {rd?.certifications && rd.certifications.length > 0 && (
            <Section title="My Certifications (from Resume)" icon={Award}>
              <div className="space-y-3">
                {rd.certifications.map((cert, i) => (
                  <div key={i} className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{cert.name}</div>
                        {cert.provider && <div className="text-xs text-amber-700">{cert.provider}</div>}
                      </div>
                      {cert.date && <div className="text-xs text-slate-400">{cert.date}</div>}
                    </div>
                    {cert.skills && cert.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cert.skills.map((s) => <span key={s} className="badge-yellow text-xs">{s}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Resume section */}
          <Section title="Resume" icon={FileText}>
            {profile?.resume_url ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{profile.resume_url.split("/").pop()}</div>
                    {rd?.analyzed_at && (
                      <div className="text-xs text-slate-400">Analyzed {new Date(rd.analyzed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    )}
                  </div>
                  {profile.resume_score != null && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black text-indigo-600">{profile.resume_score}</div>
                      <div className="text-[10px] text-slate-400">/ 100</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">
                No resume uploaded yet. <a href="/resume" className="text-indigo-600 font-semibold hover:underline">Upload your resume</a> to auto-populate your profile.
              </div>
            )}
          </Section>

          {/* Skills summary */}
          <SkillsSummary userId={user?.id} />
        </div>
      </div>
    </div>
  );
}

function SkillsSummary({ userId }: { userId?: string }) {
  const [skills, setSkills] = useState<{ skill_name: string; category: string; current_score: number; evidence: string | null; status: string }[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("user_skills").select("skill_name,category,current_score,evidence,status").eq("user_id", userId).order("current_score", { ascending: false }).then(({ data }) => {
      setSkills(data || []);
    });
  }, [userId]);

  if (skills.length === 0) return null;

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-indigo-500" />
        <h3 className="font-bold text-slate-900">Skills Profile</h3>
        <span className="text-xs text-slate-400 ml-auto">{skills.length} skills detected</span>
      </div>
      {categories.map((cat) => (
        <div key={cat} className="mb-4 last:mb-0">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{cat}</div>
          <div className="grid grid-cols-2 gap-2">
            {skills.filter((s) => s.category === cat).map((s) => (
              <div key={s.skill_name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate">{s.skill_name}</div>
                  <div className="skill-bar-track w-full mt-1" style={{ height: 3 }}>
                    <div className="h-full rounded-full" style={{
                      width: `${s.current_score}%`,
                      background: s.current_score >= 80 ? "#10b981" : s.current_score >= 60 ? "#3b82f6" : "#f59e0b"
                    }} />
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-500 flex-shrink-0">{s.current_score}%</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
