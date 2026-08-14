import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import type { Database } from "./database.types";

const supabaseUrl = "https://rwfzmjtqyglzrgxzfyei.supabase.co";
    const supabaseAnonKey = "sb_publishable_FkFnODPmW9dINYw_m927GQ_1mbWCsvX";
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "skillforge-auth",
  },
});

export const SUPABASE_URL = supabaseUrl;
export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

export async function callEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Edge function ${name} failed: ${err}`);
  }

  return res.json() as Promise<T>;
}
