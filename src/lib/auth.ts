import type { Session } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabaseServer";
import { Profile, isProfileComplete, UserType, SystemRoleType } from "./types";

export type AuthState =
  | { state: "no-session" }
  | { state: "email-unconfirmed"; session: Session; profile: Profile | null; systemRoles: string[] }
  | { state: "incomplete-profile"; session: Session; profile: Profile | null; systemRoles: string[] }
  | { state: "ready"; session: Session; profile: Profile | null; systemRoles: string[] };

export const getCurrentSessionAndProfile = async (): Promise<{
  session: Session | null;
  profile: Profile | null;
  systemRoles: string[];
}> => {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return { session: null, profile: null, systemRoles: [] };
  }

  // Parallel fetch for profile and roles
  const [profileResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle(),
    supabase
      .from("user_system_roles")
      .select("role:system_roles(name)")
      .eq("user_id", session.user.id)
  ]);

  const profile = profileResult.data as Profile | null;
  // rolesResult.data format: [{ role: { name: "admin" } }, ...]
  const systemRoles = rolesResult.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rolesResult.data as any[]).map((r) => r.role?.name).filter(Boolean)
    : [];

  // --- DEMO MODE INJECTION ---
  if (profile) {
    // We check the demo status to see if we should simulate a different role
    // We use a safe inline check to avoid massive dependency cycles contextually,
    // but importing getDemoStatus from lib/demo is safe given project structure.
    const { data: demoSession } = await supabase
      .from("demo_sessions")
      .select("enabled, demo_view")
      .eq("user_id", session.user.id)
      .single();

    if (demoSession?.enabled) {
      // Overwrite user_type based on demo_view
      if (demoSession.demo_view === 'job_provider') {
        profile.user_type = 'company';
      } else {
        profile.user_type = 'youth';
      }
    }
  }
  // ---------------------------

  return { session, profile: profile ?? null, systemRoles };
};

// Helpers
export const isAccountType = (profile: Profile | null, type: UserType) => {
  return profile?.user_type === type;
};

export const hasSystemRole = (userRoles: string[], role: SystemRoleType) => {
  return userRoles.includes(role);
};

// Klare Zustände, kein Redirect
export async function getAuthState(): Promise<AuthState> {
  const { session, profile, systemRoles } = await getCurrentSessionAndProfile();

  if (!session) {
    return { state: "no-session" } as const;
  }

  const confirmedAt = (session.user as { confirmed_at?: string } | null | undefined)?.confirmed_at;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isEmailConfirmed = Boolean((session.user as any)?.email_confirmed_at || confirmedAt);

  if (!isEmailConfirmed) {
    return { state: "email-unconfirmed", session, profile, systemRoles } as const;
  }

  if (!isProfileComplete(profile)) {
    return { state: "incomplete-profile", session, profile, systemRoles } as const;
  }

  return { state: "ready", session, profile, systemRoles } as const;
}

export const requireSession = async () => {
  const state = await getAuthState();
  if (state.state === "no-session" || state.state === "email-unconfirmed") redirect("/");
  return { session: state.session!, profile: state.profile ?? null, systemRoles: state.systemRoles };
};

export const requireCompleteProfile = async () => {
  const state = await getAuthState();
  if (state.state === "no-session" || state.state === "email-unconfirmed")
    redirect("/");
  if (state.state === "incomplete-profile") redirect("/onboarding");
  return { session: state.session!, profile: state.profile!, systemRoles: state.systemRoles };
};

export const redirectIfAuthenticated = async () => {
  const state = await getAuthState();
  if (state.state === "ready") redirect("/app-home");
};
