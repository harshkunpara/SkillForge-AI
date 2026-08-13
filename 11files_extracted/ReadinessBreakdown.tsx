import { Loader2 } from "lucide-react";
import { useReadinessBreakdown } from "../hooks/useSupabaseData";

export default function ReadinessBreakdown() {
  const { breakdown, loading, error } = useReadinessBreakdown();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="animate-spin" size={16} /> Loading readiness…
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (!breakdown) {
    return (
      <div className="text-sm text-gray-500">
        No readiness data yet. Set a target career, upload a resume, and complete an assessment to get started.
      </div>
    );
  }

  if (breakdown.readiness_status === "incomplete" || breakdown.score === null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-amber-800">Readiness: Incomplete</h3>
        <p className="mt-1 text-sm text-amber-700">
          We can't calculate a full readiness score yet — some required skills still need an assessment.
        </p>
        {breakdown.missing_inputs && breakdown.missing_inputs.length > 0 && (
          <ul className="mt-2 list-disc list-inside text-sm text-amber-700">
            {breakdown.missing_inputs.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const components = [
    { label: "Skill Match", value: breakdown.skill_match_component, max: 50 },
    { label: "Resume Quality", value: breakdown.resume_quality_component, max: 30 },
    { label: "Assessments", value: breakdown.assessment_component, max: 20 },
    { label: "Interview", value: breakdown.interview_component, max: 0 }, // max stays 0 until weighting is revisited
  ];

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Readiness Score</h3>
        <span className="text-2xl font-bold text-gray-900">
          {Math.round(breakdown.score)}
          <span className="text-sm font-normal text-gray-500">/100</span>
        </span>
      </div>

      <div className="space-y-2">
        {components.map((c) => (
          <div key={c.label}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{c.label}</span>
              <span>
                {c.value !== null ? c.value.toFixed(1) : "—"}
                {c.max > 0 ? ` / ${c.max}` : ""}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{
                  width: c.max > 0 && c.value !== null ? `${(c.value / c.max) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Last calculated {new Date(breakdown.recorded_at).toLocaleString()}
      </p>
    </div>
  );
}
