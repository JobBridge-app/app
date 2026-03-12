import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Market } from "@/lib/types";
import type { AccountType, Profile } from "@/lib/types";
import type { AppHeaderProfile, AppHomeSnapshot, EffectiveViewSnapshot, HeaderNotificationItem } from "@/lib/types/jobbridge";

function buildFallbackView(profile: Profile): EffectiveViewSnapshot {
  return {
    isDemoEnabled: false,
    viewRole: (profile.account_type ?? "job_seeker") as AccountType,
    source: "live",
    roles: [],
    overrideExpiresAt: null,
  };
}

export const getMarketSummary = cache(async (marketId: string | null | undefined): Promise<Market | null> => {
  if (!marketId) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("regions_live")
    .select("id, city, is_live, display_name, brand_prefix")
    .eq("id", marketId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    display_name: data.display_name || data.city,
    brand_prefix: data.brand_prefix || "JobBridge",
    is_live: data.is_live,
  };
});

const getNotificationSummary = cache(async (userId: string): Promise<{
  unreadCount: number;
  notificationsPreview: HeaderNotificationItem[];
}> => {
  const supabase = await supabaseServer();
  const [countResult, rowsResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id, type, title, body, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    unreadCount: countResult.count || 0,
    notificationsPreview: (rowsResult.data ?? []) as HeaderNotificationItem[],
  };
});

const getVerificationState = cache(async (
  profileId: string,
  viewRole: AccountType,
  guardianStatus: string | null,
  providerVerificationStatus: string | null,
  providerVerifiedAt: string | null,
): Promise<{
  guardianStatus: string;
  hasActiveGuardian: boolean;
  isVerified: boolean;
  canApply: boolean;
}> => {
  if (viewRole === "job_provider") {
    const isVerified = providerVerificationStatus === "verified" || Boolean(providerVerifiedAt);
    return {
      guardianStatus: guardianStatus ?? "none",
      hasActiveGuardian: false,
      isVerified,
      canApply: false,
    };
  }

  if (guardianStatus !== "linked") {
    return {
      guardianStatus: guardianStatus ?? "none",
      hasActiveGuardian: false,
      isVerified: false,
      canApply: false,
    };
  }

  const supabase = await supabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("guardian_relationships")
    .select("*", { count: "exact", head: true })
    .eq("child_id", profileId)
    .eq("status", "active");

  const hasActiveGuardian = count !== null && count > 0;

  return {
    guardianStatus: hasActiveGuardian ? "linked" : "none",
    hasActiveGuardian,
    isVerified: hasActiveGuardian,
    canApply: hasActiveGuardian,
  };
});

export const getAppHomeSnapshot = cache(async (): Promise<AppHomeSnapshot> => {
  const authState = await getAuthState();

  if (authState.state === "no-session" || authState.state === "email-unconfirmed") {
    redirect("/");
  }

  if (authState.state === "incomplete-profile") {
    redirect("/onboarding");
  }

  const profile = authState.profile!;
  const effectiveView = authState.effectiveView ?? buildFallbackView(profile);

  const [market, verification, notifications] = await Promise.all([
    getMarketSummary(profile.market_id),
    getVerificationState(
      profile.id,
      effectiveView.viewRole,
      profile.guardian_status,
      profile.provider_verification_status,
      profile.provider_verified_at,
    ),
    getNotificationSummary(profile.id),
  ]);

  const accountEmail = profile.email?.trim() || null;
  const normalizedProfile: AppHeaderProfile = {
    ...profile,
    account_type: effectiveView.viewRole,
    guardian_status: verification.guardianStatus as Profile["guardian_status"],
    has_active_guardian: verification.hasActiveGuardian,
  };

  return {
    sessionUserId: profile.id,
    profile: normalizedProfile,
    profileLite: normalizedProfile,
    effectiveView,
    market,
    isDemo: effectiveView.source === "demo",
    isStaff: authState.systemRoles.some((role) => ["admin", "moderator", "analyst"].includes(role)),
    accountEmail,
    guardianStatus: verification.guardianStatus,
    hasActiveGuardian: verification.hasActiveGuardian,
    isVerified: verification.isVerified,
    canApply: verification.canApply,
    unreadCount: notifications.unreadCount,
    notificationsPreview: notifications.notificationsPreview,
  };
});
