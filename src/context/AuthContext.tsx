import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureProfile(user: User): Promise<Profile | null> {
  // Try to fetch existing profile first
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (existing) return existing;

  // Create profile if it doesn't exist (trigger may not have fired)
  const { data: created } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      onboarding_complete: false,
      placement_readiness: 0,
    })
    .select()
    .single();

  return created;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(u: User) {
    const p = await ensureProfile(u);
    setProfile(p);
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user);
      } else {
        setProfile(null);
      }

      // On initial SIGNED_IN stop loading
      if (event === "SIGNED_IN") {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function humanizeAuthError(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes("origin") && m.includes("disallowed")) {
      return "Supabase is not configured to accept requests from this domain. Open your Supabase dashboard → Authentication → URL Configuration and add this site's URL to the allowed list. Also disable 'Confirm email' under Authentication → Providers → Email for development.";
    }
    if (m.includes("email not confirmed")) {
      return "Please confirm your email before signing in — check your inbox for the verification link.";
    }
    if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
      return "Incorrect email or password.";
    }
    if (m.includes("already registered") || m.includes("user already registered")) {
      return "An account with this email already exists. Try signing in instead.";
    }
    if (m.includes("password should be at least")) {
      return "Password must be at least 6 characters.";
    }
    return msg;
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: humanizeAuthError(error.message) };
    return { error: null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      return { error: humanizeAuthError(error.message), needsConfirmation: false };
    }

    // If user is returned but session is null, email confirmation is required
    const needsConfirmation = !!data.user && !data.session;

    // If we have an immediate session (confirmation disabled), create profile now
    if (data.session && data.user) {
      await ensureProfile(data.user);
    }

    return { error: null, needsConfirmation };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (data) setProfile(data);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user);
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signIn, signUp, signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
