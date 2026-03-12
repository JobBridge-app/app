"use client";

import { LeftBrandChip } from "./header/LeftBrandChip";
import { CenterNavPill } from "./header/CenterNavPill";
import { RightActionGroup } from "./header/RightActionGroup";
import { HeaderWarmup } from "./header/HeaderWarmup";
import type { AppHomeSnapshot } from "@/lib/types/jobbridge";

export function AppHeader({ snapshot }: { snapshot: AppHomeSnapshot }) {
    const siblingRoutes = snapshot.profile.account_type === "job_provider"
        ? ["/app-home/offers", "/app-home/activities", "/app-home/settings"]
        : ["/app-home/jobs", "/app-home/activities", "/app-home/settings"];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 md:px-8 pointer-events-none">
            <HeaderWarmup routes={siblingRoutes} />
            <div className="max-w-7xl mx-auto h-[52px] flex items-center justify-between gap-2 md:gap-4 pointer-events-auto">
                <div className="flex-shrink-0 flex items-center gap-1 md:gap-3">
                    <LeftBrandChip market={snapshot.market} />
                </div>

                <div className="hidden md:flex absolute left-1/2 top-4 -translate-x-1/2">
                    <CenterNavPill profile={snapshot.profile} instanceId="desktop" />
                </div>
                <div className="flex md:hidden">
                    <CenterNavPill profile={snapshot.profile} instanceId="mobile" />
                </div>

                <div className="flex-shrink-0 flex justify-end gap-2 md:gap-4">
                    <div className="flex items-center">
                        <RightActionGroup
                            profile={snapshot.profile}
                            isDemo={snapshot.isDemo}
                            isStaff={snapshot.isStaff}
                            accountEmail={snapshot.accountEmail}
                            unreadCount={snapshot.unreadCount}
                            notificationsPreview={snapshot.notificationsPreview}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
