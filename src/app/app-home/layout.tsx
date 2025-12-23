import { AppHeader } from "@/components/layout/AppHeader";
import { getAuthState, requireCompleteProfile } from "@/lib/auth";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { redirect } from "next/navigation";
import { getDemoStatus } from "@/lib/demo";

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

    const { isEnabled: isDemo } = await getDemoStatus(profile.id);

    return (
        <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-50">
            {/* Shared Background for the entire app area */}
            <LiquidBackground />

            {/* Persistent Header */}
            <AppHeader profile={profile} isDemo={isDemo} />

            {/* Page Content */}
            <main className="relative z-10 flex-1 pt-24">
                {children}
            </main>

            {/* Shared Footer (Optional, can be added later) */}
        </div>
    );
}
