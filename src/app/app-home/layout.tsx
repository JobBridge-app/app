import { AppHeader } from "@/components/layout/AppHeader";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { DebugRolePanel } from "@/components/debug/DebugRolePanel";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { RoleOverrideExpiryWatcher } from "@/components/auth/RoleOverrideExpiryWatcher";
import { getAppHomeSnapshot } from "@/lib/app-shell";

export default async function AppHomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const snapshot = await getAppHomeSnapshot();

    return (
        <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-50">
            {/* Shared Background for the entire app area */}
            <LiquidBackground />

            {/* Persistence & Logic */}
            <RoleOverrideExpiryWatcher overrideExpiresAt={snapshot.effectiveView.overrideExpiresAt} />
            <DebugRolePanel profile={snapshot.profile} />
            <RoleGuard profile={snapshot.profile} />

            {/* Persistent Header */}
            <AppHeader snapshot={snapshot} />

            {/* Page Content */}
            <main className="relative z-10 flex-1 pt-24">
                {children}
            </main>

            {/* Shared Footer (Optional, can be added later) */}
        </div>
    );
}
