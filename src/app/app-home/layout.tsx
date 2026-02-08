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
    const effectiveProfile = { ...profile, account_type: view.viewRole };
    const isDemo = view.source === "demo";

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
