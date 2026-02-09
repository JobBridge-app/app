import { AppHeader } from "@/components/layout/AppHeader";
import { requireCompleteProfile } from "@/lib/auth";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { redirect } from "next/navigation";
import { DebugRolePanel } from "@/components/debug/DebugRolePanel";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { getEffectiveView } from "@/lib/dal/jobbridge";
import { RoleOverrideExpiryWatcher } from "@/components/auth/RoleOverrideExpiryWatcher";

export default async function AppHomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Use requireCompleteProfile to ensure we have a valid session and profile
    const { profile } = await requireCompleteProfile();

    if (!profile) {
        redirect("/");
    }

    const viewRes = await getEffectiveView({ userId: profile.id, baseAccountType: profile.account_type });
    const view = viewRes.ok
        ? viewRes.data
        : { isDemoEnabled: false, viewRole: profile.account_type ?? "job_seeker", source: "live" as const, overrideExpiresAt: null };

    // Ensure *all* client components in this layout see the same effective role (demo_view or override).
    const isDemo = view.source === "demo";

    // Enhanced Verification Check for Header
    // If job_seeker and status says "linked", verify actual relationship exists (Self-healing)
    let isVerified = false;
    if (view.viewRole === "job_provider") {
        isVerified = profile.provider_verification_status === "verified" || Boolean(profile.provider_verified_at);
    } else {
        // Job Seeker
        if (profile.guardian_status === "linked") {
            const { supabaseServer } = await import("@/lib/supabaseServer");
            const sb = await supabaseServer();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count } = await (sb as any)
                .from("guardian_relationships")
                .select("*", { count: 'exact', head: true })
                .eq("child_id", profile.id)
                .eq("status", "active");

            isVerified = count !== null && count > 0;
        }
    }

    // Inject this verification status into the profile object passed to header?
    // Profile type doesn't have 'isVerified'. We can attach it as extended property or pass separate prop?
    // AppHeader takes 'profile'. ProfileChip takes 'profile'.
    // I will attach it to the profile object as a temporary property that ProfileChip can read if I cast it, 
    // OR BETTER: I will modify AppHeader to accept isVerified prop.
    // Let's check AppHeader definition first. I'll pass it as a hacked property for now to avoid changing all signatures 
    // or I'll check AppHeader.
    // Actually, I can just update the profile object to have guardian_status = 'none' if check fails!
    // This is the cleanest way. It "fixes" the profile data flowing down.

    const effectiveProfile = { ...profile, account_type: view.viewRole };
    if (view.viewRole === "job_seeker" && profile.guardian_status === "linked" && !isVerified) {
        effectiveProfile.guardian_status = "none"; // Downgrade status for UI
    }

    return (
        <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-50">
            {/* Shared Background for the entire app area */}
            <LiquidBackground />

            {/* Persistence & Logic */}
            <RoleOverrideExpiryWatcher overrideExpiresAt={view.overrideExpiresAt} />
            <DebugRolePanel profile={effectiveProfile} />
            <RoleGuard profile={effectiveProfile} />

            {/* Persistent Header */}
            <AppHeader profile={effectiveProfile} isDemo={isDemo} />

            {/* Page Content */}
            <main className="relative z-10 flex-1 pt-24">
                {children}
            </main>

            {/* Shared Footer (Optional, can be added later) */}
        </div>
    );
}
