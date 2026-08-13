import { useState } from "react";
import { Save, Sparkles, Brain, Settings, Shield, Bell } from "lucide-react";

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);
  const [aiModel, setAiModel] = useState("claude-sonnet-5");
  const [gapThreshold, setGapThreshold] = useState(20);
  const [minConfidence, setMinConfidence] = useState(65);
  const [maxRecs, setMaxRecs] = useState(10);
  const [assessmentQs, setAssessmentQs] = useState(10);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)} className={`w-10 h-6 rounded-full transition-all relative ${value ? "bg-indigo-500" : "bg-gray-300"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-1"}`} />
    </button>
  );

  const sectionCls = "admin-card mb-5";
  const labelCls = "text-sm font-medium text-gray-700";
  const inputCls = "px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-amber-400 transition-colors";
  const rowCls = "flex items-center justify-between py-3 border-b border-gray-50 last:border-0";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-0.5">Configure AI models, thresholds, and platform behavior.</p>
        </div>
        <button onClick={handleSave} className="btn-primary text-sm px-5 py-2.5">
          {saved ? <><span className="text-green-200">✓</span> Saved!</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      <div className="rounded-xl p-3 mb-5 flex items-center gap-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
        <Shield size={14} className="text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700">API keys and credentials are never displayed in the UI. Configure them through environment variables only.</p>
      </div>

      {/* AI Configuration */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-indigo-500" />
          <h3 className="font-bold text-gray-900">AI Model Configuration</h3>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>AI Model</div>
            <div className="text-xs text-gray-400 mt-0.5">Model used for roadmap generation and interview evaluation</div>
          </div>
          <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className={inputCls}>
            <option value="claude-sonnet-5">claude-sonnet-5 (Recommended)</option>
            <option value="claude-haiku-4-5">claude-haiku-4-5 (Faster)</option>
            <option value="claude-opus-5">claude-opus-5 (Most Capable)</option>
          </select>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Max Recommendations Per User</div>
            <div className="text-xs text-gray-400 mt-0.5">Maximum AI recommendations shown per student per session</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={maxRecs} onChange={(e) => setMaxRecs(+e.target.value)} min={5} max={25} className={`${inputCls} w-20 text-center`} />
            <span className="text-xs text-gray-400">items</span>
          </div>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Auto-update Roadmaps</div>
            <div className="text-xs text-gray-400 mt-0.5">Automatically adapt roadmaps when assessment scores change</div>
          </div>
          <Toggle value={autoUpdate} onChange={setAutoUpdate} />
        </div>
      </div>

      {/* Skill scoring */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-violet-500" />
          <h3 className="font-bold text-gray-900">Skill Scoring & Thresholds</h3>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Critical Gap Threshold</div>
            <div className="text-xs text-gray-400 mt-0.5">Gap percentage that triggers a "Critical" priority label</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="range" min={10} max={40} value={gapThreshold} onChange={(e) => setGapThreshold(+e.target.value)} className="w-24" />
            <span className="text-sm font-bold text-gray-700 w-8">{gapThreshold}%</span>
          </div>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Minimum Verification Confidence</div>
            <div className="text-xs text-gray-400 mt-0.5">Minimum confidence to mark a skill as "Verified"</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="range" min={50} max={95} value={minConfidence} onChange={(e) => setMinConfidence(+e.target.value)} className="w-24" />
            <span className="text-sm font-bold text-gray-700 w-8">{minConfidence}%</span>
          </div>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Assessment Questions Per Skill</div>
            <div className="text-xs text-gray-400 mt-0.5">Number of questions in each skill verification assessment</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={assessmentQs} onChange={(e) => setAssessmentQs(+e.target.value)} min={5} max={20} className={`${inputCls} w-20 text-center`} />
            <span className="text-xs text-gray-400">questions</span>
          </div>
        </div>
      </div>

      {/* Platform settings */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-gray-500" />
          <h3 className="font-bold text-gray-900">Platform Settings</h3>
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Email Notifications</div>
            <div className="text-xs text-gray-400 mt-0.5">Send students progress reports and AI recommendations via email</div>
          </div>
          <Toggle value={emailNotifs} onChange={setEmailNotifs} />
        </div>

        <div className={rowCls}>
          <div>
            <div className={labelCls}>Maintenance Mode</div>
            <div className="text-xs text-gray-400 mt-0.5">Show maintenance page to students while admin tasks are running</div>
          </div>
          <Toggle value={maintenanceMode} onChange={setMaintenanceMode} />
        </div>
      </div>

      {/* Danger zone */}
      <div className="admin-card border border-red-200 bg-red-50">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-red-500" />
          <h3 className="font-bold text-red-700">Danger Zone</h3>
        </div>
        <div className={`${rowCls} border-red-100`}>
          <div>
            <div className="text-sm font-medium text-red-700">Reset All AI Recommendations</div>
            <div className="text-xs text-red-400 mt-0.5">Clears cached recommendations for all users. Cannot be undone.</div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors">Reset</button>
        </div>
        <div className={rowCls}>
          <div>
            <div className="text-sm font-medium text-red-700">Export All Student Data</div>
            <div className="text-xs text-red-400 mt-0.5">Export complete database as CSV. Ensure GDPR compliance.</div>
          </div>
          <button className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors">Export</button>
        </div>
      </div>
    </div>
  );
}
