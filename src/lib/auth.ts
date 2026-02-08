import type { Session } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabaseServer";
import { Profile, isProfileComplete, SystemRoleType, AccountType } from "./types";

export type AuthState =
  | { state: "no-session" }
  | { state: "email-unconfirmed"; session: Session; profile: Profile | null; systemRoles: string[] }
  | { state: "incomplete-profile"; session: Session; profile: Profile | null; systemRoles: string[] }
  | { state: "ready"; session: Session; profile: Profile | null; systemRoles: string[] };

/**
 * Helper to determine if we should look at Live Data or Demo Data
 */
export async function getDataSource(userId: string) {
  const supabase = await supabaseServer();
  const { data: demoSession } = await supabase
    .from("demo_sessions")
    .select("enabled, demo_view")
    .eq("user_id", userId)
    .single();

  if (demoSession?.enabled) {
    return {
      mode: 'demo' as const,
      view: demoSession.demo_view as AccountType
    };
  }
  return { mode: 'live' as const };
}

export async function getActiveOverride(userId: string) {
  const supabase = await supabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: override } = await supabase
    .from("role_overrides" as any)
    .select("view_as, expires_at")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle() as any;

  return override;
}

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

  // Parallel fetch: profile, roles, demo session, active override
  // We do manual parallel queries to keep it clean
  const [profileResult, rolesResult, demoResult, overrideResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.from("user_system_roles").select("role:system_roles(name)").eq("user_id", session.user.id),
    supabase.from("demo_sessions").select("enabled, demo_view").eq("user_id", session.user.id).single(),
    (supabase.from("role_overrides" as any).select("view_as, expires_at").eq("user_id", session.user.id).gt("expires_at", new Date().toISOString()).maybeSingle() as any)
  ]);

  const profile = profileResult.data as Profile | null;
  if (profile && !profile.email && session.user.email) {
    profile.email = session.user.email;
  }

  // Extract system roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const systemRoles = rolesResult.data ? (rolesResult.data as any[]).map((r) => r.role?.name).filter(Boolean) : [];

  // Determine Effective Account Type
  let accountType: AccountType = 'job_seeker'; // Default

  if (profile) {
    // Priority 1: Demo Mode (highest priority for view)
    if (demoResult.data?.enabled) {
      accountType = demoResult.data.demo_view as AccountType;
    }
    // Priority 2: Override (if not in demo, allows testing logic on real data)
    else if (overrideResult.data) {
      accountType = overrideResult.data.view_as as AccountType;
    }
    // Priority 3: Base Profile
    else {
      accountType = (profile.account_type as AccountType | null) ?? "job_seeker";
    }

    profile.account_type = accountType;
  }

  return { session, profile: profile ?? null, systemRoles };
};

// Helpers
export const isAccountType = (profile: Profile | null, type: AccountType) => {
  return profile?.account_type === type;
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
