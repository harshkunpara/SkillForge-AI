import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const requirements = [
  // Full Stack Developer
  { career_role: "Full Stack Developer", skill_name: "React", category: "Development", required_score: 80 },
  { career_role: "Full Stack Developer", skill_name: "Node.js", category: "Development", required_score: 75 },
  { career_role: "Full Stack Developer", skill_name: "SQL", category: "Development", required_score: 80 },
  { career_role: "Full Stack Developer", skill_name: "TypeScript", category: "Development", required_score: 80 },
  { career_role: "Full Stack Developer", skill_name: "DevOps", category: "Development", required_score: 70 },
  { career_role: "Full Stack Developer", skill_name: "System Design", category: "Development", required_score: 75 },
  
  // Software Engineer
  { career_role: "Software Engineer", skill_name: "Data Structures", category: "DSA", required_score: 80 },
  { career_role: "Software Engineer", skill_name: "System Design", category: "Development", required_score: 75 },
  { career_role: "Software Engineer", skill_name: "TypeScript", category: "Development", required_score: 80 },
  { career_role: "Software Engineer", skill_name: "Testing", category: "Development", required_score: 70 },
  { career_role: "Software Engineer", skill_name: "DevOps", category: "Development", required_score: 60 },
  { career_role: "Software Engineer", skill_name: "SQL", category: "Development", required_score: 80 },

  // AI/ML Engineer
  { career_role: "AI/ML Engineer", skill_name: "Python", category: "Development", required_score: 90 },
  { career_role: "AI/ML Engineer", skill_name: "Machine Learning", category: "CS Fundamentals", required_score: 85 },
  { career_role: "AI/ML Engineer", skill_name: "SQL", category: "Development", required_score: 75 },
  { career_role: "AI/ML Engineer", skill_name: "Data Structures", category: "DSA", required_score: 80 },

  // Data Scientist
  { career_role: "Data Scientist", skill_name: "Python", category: "Development", required_score: 85 },
  { career_role: "Data Scientist", skill_name: "SQL", category: "Development", required_score: 80 },
  { career_role: "Data Scientist", skill_name: "Machine Learning", category: "CS Fundamentals", required_score: 75 },

  // Cybersecurity
  { career_role: "Cybersecurity", skill_name: "Networks", category: "CS Fundamentals", required_score: 85 },
  { career_role: "Cybersecurity", skill_name: "Security", category: "CS Fundamentals", required_score: 90 },
  
  // Cloud Engineer
  { career_role: "Cloud Engineer", skill_name: "AWS", category: "Development", required_score: 85 },
  { career_role: "Cloud Engineer", skill_name: "DevOps", category: "Development", required_score: 80 }
];

async function seed() {
  console.log("Seeding skill requirements...");
  for (const r of requirements) {
    const { error } = await supabaseAdmin.from("skill_requirements").upsert(r, { onConflict: "career_role,skill_name" });
    if (error) console.error("Error inserting:", r, error.message);
  }
  console.log("Seeding complete!");
}

seed();
