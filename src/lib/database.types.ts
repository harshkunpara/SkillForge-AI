export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          college: string | null;
          degree: string | null;
          year: string | null;
          branch: string | null;
          experience_level: string | null;
          target_career: string | null;
          target_companies: string[] | null;
          github_username: string | null;
          resume_url: string | null;
          resume_score: number | null;
          placement_readiness: number | null;
          onboarding_complete: boolean;
          // Extended fields (added in migration 002)
          phone: string | null;
          bio: string | null;
          graduation_year: string | null;
          weekly_hours: number | null;
          career_goal: string | null;
          target_company: string | null;
          avatar_url: string | null;
          resume_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      user_skills: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string;
          category: string;
          resume_level: string | null;
          verified_level: string | null;
          current_score: number;
          confidence: number | null;
          evidence: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_skills"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["user_skills"]["Insert"]>;
      };
      skill_gaps: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string;
          current_score: number;
          required_score: number;
          gap: number;
          priority: string;
          reason: string | null;
          recommended_action: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["skill_gaps"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["skill_gaps"]["Insert"]>;
      };
      roadmaps: {
        Row: {
          id: string;
          user_id: string;
          target_career: string;
          current_readiness: number;
          ai_updated_at: string | null;
          ai_update_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["roadmaps"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["roadmaps"]["Insert"]>;
      };
      roadmap_phases: {
        Row: {
          id: string;
          roadmap_id: string;
          phase_number: number;
          title: string;
          duration: string;
          status: string;
          progress: number;
          skills: string[];
          ai_added: boolean;
          ai_reason: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["roadmap_phases"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["roadmap_phases"]["Insert"]>;
      };
      roadmap_tasks: {
        Row: {
          id: string;
          phase_id: string;
          name: string;
          type: string;
          done: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["roadmap_tasks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["roadmap_tasks"]["Insert"]>;
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          resume_url: string;
          score: number;
          skills_detected: Json;
          sections: Json;
          improvements: Json;
          raw_text: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["resume_analyses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["resume_analyses"]["Insert"]>;
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string;
          questions: Json;
          answers: Json;
          score: number;
          verified_level: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assessments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["assessments"]["Insert"]>;
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: string;
          difficulty: string;
          questions: Json;
          answers: Json;
          scores: Json;
          overall_score: number;
          weak_areas: string[];
          feedback: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interview_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["interview_sessions"]["Insert"]>;
      };
      readiness_history: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          dsa_score: number | null;
          dev_score: number | null;
          cs_score: number | null;
          projects_score: number | null;
          interview_score: number | null;
          resume_score: number | null;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["readiness_history"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["readiness_history"]["Insert"]>;
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          description: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
