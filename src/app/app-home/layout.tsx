import { AppHeader } from "@/components/layout/AppHeader";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { getAppHomeSnapshot } from "@/lib/app-shell";
import {
    AppNavigationProvider,
    AppNavigationViewport,
} from "@/components/layout/AppNavigationProvider";

export default async function AppHomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const snapshot = await getAppHomeSnapshot();

    return (
        <AppNavigationProvider>
            <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
                {/* Shared Background for the entire app area */}
                <LiquidBackground />

                <RoleGuard profile={snapshot.profile} />

                {/* Persistent Header */}
                <AppHeader snapshot={snapshot} />

                {/* Page Content */}
                <main className="app-shell-main relative z-10 flex-1 pt-24">
                    <AppNavigationViewport>{children}</AppNavigationViewport>
                </main>

                {/* Shared Footer (Optional, can be added later) */}
            </div>
        </AppNavigationProvider>
    );
}
