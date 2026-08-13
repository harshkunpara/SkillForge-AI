import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function check() {
  const userId = "3b969b24-a179-4592-b1ee-11ce14b1c881";
  
  console.log("Recalculating skill gaps via RPC...");
  await supabaseAdmin.rpc("recalculate_skill_gaps", { p_user_id: userId });

  const { data: skillGaps } = await supabaseAdmin.from("skill_gaps").select("*");
  console.log("SKILL_GAPS FOR USER:", skillGaps);
}

check();
