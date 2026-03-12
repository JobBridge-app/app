import type { Session } from "@supabase/supabase-js";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabaseServer";
import { Profile, isProfileComplete, SystemRoleType, AccountType } from "./types";
import type { EffectiveViewSnapshot } from "./types/jobbridge";

export type AuthState =
  | { state: "no-session" }
  | { state: "email-unconfirmed"; session: Session; profile: Profile | null; systemRoles: string[]; effectiveView: EffectiveViewSnapshot | null }
  | { state: "incomplete-profile"; session: Session; profile: Profile | null; systemRoles: string[]; effectiveView: EffectiveViewSnapshot | null }
  | { state: "ready"; session: Session; profile: Profile | null; systemRoles: string[]; effectiveView: EffectiveViewSnapshot | null };

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

const getCurrentSessionAndProfileCached = cache(async (): Promise<{
  session: Session | null;
  profile: Profile | null;
  systemRoles: string[];
  effectiveView: EffectiveViewSnapshot | null;
}> => {
  const supabase = await supabaseServer();

  // Use getUser() first — this contacts the Supabase Auth server and
  // refreshes the session if the access token has expired.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return { session: null, profile: null, systemRoles: [], effectiveView: null };
  }

  // Now safe to read session metadata (tokens are already refreshed by getUser above)
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, profile: null, systemRoles: [], effectiveView: null };
  }

  // Parallel fetch: profile, roles, demo session, active override
  // We do manual parallel queries to keep it clean
  const [profileResult, rolesResult, demoResult, overrideResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.from("user_system_roles").select("role:system_roles(name)").eq("user_id", session.user.id),
    supabase.from("demo_sessions").select("enabled, demo_view").eq("user_id", session.user.id).maybeSingle(),
    (supabase.from("role_overrides" as any).select("view_as, expires_at").eq("user_id", session.user.id).gt("expires_at", new Date().toISOString()).maybeSingle() as any)
  ]);

  const profile = profileResult.data as Profile | null;
  if (profile && !profile.email && session.user.email) {
    profile.email = session.user.email;
  }

  // Extract system roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const systemRoles = rolesResult.data ? (rolesResult.data as any[]).map((r) => r.role?.name).filter(Boolean) : [];

  let effectiveView: EffectiveViewSnapshot | null = null;

  if (profile) {
    const baseRole = (profile.account_type as AccountType | null) ?? "job_seeker";
    const demoView = demoResult.data?.enabled
      ? ((demoResult.data.demo_view as AccountType | null) ?? "job_seeker")
      : null;
    const overrideView = overrideResult.data
      ? (overrideResult.data.view_as as AccountType)
      : null;

    effectiveView = demoView
      ? {
          isDemoEnabled: true,
          viewRole: demoView,
          source: "demo",
          roles: systemRoles,
          demoView,
          overrideExpiresAt: null,
        }
      : {
          isDemoEnabled: false,
          viewRole: overrideView ?? baseRole,
          source: "live",
          roles: systemRoles,
          overrideExpiresAt: overrideResult.data?.expires_at ?? null,
        };

    profile.account_type = effectiveView.viewRole;
  }

  return { session, profile: profile ?? null, systemRoles, effectiveView };
});

export const getCurrentSessionAndProfile = async () => getCurrentSessionAndProfileCached();

// Helpers
export const isAccountType = (profile: Profile | null, type: AccountType) => {
  return profile?.account_type === type;
};

export const hasSystemRole = (userRoles: string[], role: SystemRoleType) => {
  return userRoles.includes(role);
};

// Klare Zustände, kein Redirect
const getAuthStateCached = cache(async (): Promise<AuthState> => {
  const { session, profile, systemRoles, effectiveView } = await getCurrentSessionAndProfileCached();

  if (!session) {
    return { state: "no-session" } as const;
  }

  const confirmedAt = (session.user as { confirmed_at?: string } | null | undefined)?.confirmed_at;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isEmailConfirmed = Boolean((session.user as any)?.email_confirmed_at || confirmedAt);

  if (!isEmailConfirmed) {
    return { state: "email-unconfirmed", session, profile, systemRoles, effectiveView } as const;
  }

  if (!isProfileComplete(profile)) {
    return { state: "incomplete-profile", session, profile, systemRoles, effectiveView } as const;
  }

  return { state: "ready", session, profile, systemRoles, effectiveView } as const;
});

export async function getAuthState(): Promise<AuthState> {
  return getAuthStateCached();
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
