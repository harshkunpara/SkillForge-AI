import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, User } from "lucide-react";
import { callEdgeFunction } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface Msg {
  role: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "What should I learn today?",
  "Why is SQL my biggest gap?",
  "Am I ready for an SDE interview?",
  "What project should I build?",
  "How can I improve my resume?",
];

const AI_RESPONSES: Record<string, string> = {
  "What should I learn today?":
    "Based on your current roadmap and skill gaps, I recommend: **1. SQL Joins practice** (30 min) — your SQL is at 25% vs the required 70%. **2. Solve 2 Linked List problems** — DSA is your second biggest gap. **3. Review DBMS normalization concepts** — this keeps appearing in your mock interview weak spots.",
  "Why is SQL my biggest gap?":
    "Your target role (Software Engineer at product companies) requires SQL proficiency at 70%+. Your verified SQL level from last week's assessment was only 25%. You've used basic SELECT queries in past projects, but joins, subqueries, and query optimization haven't been tested. This is critical to fix before interviews.",
  "Am I ready for an SDE interview?":
    "Your current readiness is 78%. You're strong in Resume (91%) and Projects (84%), but Interview preparation (65%) and CS Fundamentals (61%) need work. I'd suggest 2 more weeks of focused DSA and 3 mock interview sessions before applying. You're close — stay consistent.",
  "What project should I build?":
    "Given your skill gaps in SQL and backend development, I recommend building a **Library Management System** — it covers SQL design, REST APIs, authentication, and CRUD operations. It's directly relevant to SDE roles and takes ~3 weeks. Would you like me to generate a detailed project plan?",
  "How can I improve my resume?":
    "Your resume scored 82/100. Key improvements: **1.** Quantify impact in project descriptions (e.g., 'reduced load time by 40%'). **2.** Add your SQL and DBMS projects once you complete them. **3.** Include GitHub links for each project. **4.** Remove the outdated 'Typing Speed' skill — it's not relevant for SDE roles.",
};

const DEFAULT_RESPONSE =
  "That's a great question! Based on your profile — you're targeting Software Engineer roles with 78% placement readiness. Your strongest areas are Resume and Projects, while SQL and DBMS need the most attention right now. Is there a specific area you'd like to focus on?";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AIAssistant({ open, onClose }: Props) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: `Hi ${profile?.full_name?.split(" ")[0] || "there"}! I'm your SkillForge AI assistant. I know your complete profile — your skills, gaps, roadmap, and goals. What would you like to know?` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);

    try {
      const history = messages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const result = await callEdgeFunction<{ reply: string }>("ai-assistant", { message: text, history });
      setMessages((m) => [...m, { role: "ai", text: result.reply }]);
    } catch {
      // Fallback to local responses when not connected
      const reply = AI_RESPONSES[text] ?? DEFAULT_RESPONSE;
      setMessages((m) => [...m, { role: "ai", text: reply }]);
    }
    setTyping(false);
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-fade-in" style={{ height: 520, maxHeight: "80vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">SkillForge AI</div>
          <div className="text-indigo-200 text-xs">Knows your full profile</div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.role === "ai" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>
              {m.role === "ai" ? <Sparkles size={13} /> : <User size={13} />}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "ai" ? "bg-slate-50 text-slate-800 rounded-tl-sm" : "text-white rounded-tr-sm"}`}
              style={m.role === "user" ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
              dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
            />
          </div>
        ))}
        {typing && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <Sparkles size={13} className="text-indigo-600" />
            </div>
            <div className="bg-slate-50 rounded-xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animation: `bounce 1s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="bg-white border-t border-slate-100 px-4 py-2">
          <div className="text-xs text-slate-400 mb-2 font-medium">Suggested questions</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-100 px-3 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask about your career path..."
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
        />
        <button
          onClick={() => send(input)}
          className="p-2 rounded-lg text-white transition-all hover:shadow-md"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0) } 40% { transform: scale(1) } }`}</style>
    </div>
  );
}
