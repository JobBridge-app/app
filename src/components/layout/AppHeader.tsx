"use client";

import { useEffect, useState } from "react";
import { LeftBrandChip } from "./header/LeftBrandChip";
import { CenterNavPill } from "./header/CenterNavPill";
import { RightActionGroup } from "./header/RightActionGroup";
import { MobileBottomDock } from "./header/MobileBottomDock";
import type { AppHomeSnapshot } from "@/lib/types/jobbridge";
import { usePhoneDevice } from "@/hooks/use-phone-device";
import {
    normalizeMobileNavPreference,
    type MobileNavPreference,
} from "@/lib/mobile-nav-preference";

export function AppHeader({ snapshot }: { snapshot: AppHomeSnapshot }) {
    const isPhoneDevice = usePhoneDevice();
    const [mobileNavPreference, setMobileNavPreference] = useState<MobileNavPreference>(
        normalizeMobileNavPreference(snapshot.profile.mobile_nav_preference)
    );
    const useBottomDock = isPhoneDevice && mobileNavPreference === "bottom";
    useEffect(() => {
        setMobileNavPreference(normalizeMobileNavPreference(snapshot.profile.mobile_nav_preference));
    }, [snapshot.profile.mobile_nav_preference]);

    useEffect(() => {
        document.documentElement.dataset.mobileNavPreference = mobileNavPreference;
        return () => {
            delete document.documentElement.dataset.mobileNavPreference;
        };
    }, [mobileNavPreference]);

    useEffect(() => {
        const handlePreferenceChange = (event: Event) => {
            const nextPreference = (event as CustomEvent<{ preference?: unknown }>).detail?.preference;
            setMobileNavPreference(normalizeMobileNavPreference(nextPreference));
        };

        window.addEventListener("jobbridge:mobile-nav-preference", handlePreferenceChange);
        return () => window.removeEventListener("jobbridge:mobile-nav-preference", handlePreferenceChange);
    }, []);

    return (
        <>
            <div aria-hidden="true" className="app-header-scrim pointer-events-none fixed inset-x-0 top-0 z-40" />
            <header className="app-header-shell pointer-events-none fixed left-0 right-0 top-0 z-50 px-4 md:px-6 lg:px-8">
                <div className="pointer-events-auto mx-auto flex h-[52px] max-w-7xl items-center justify-between gap-1.5 md:gap-3 lg:gap-4">
                    <div className="flex flex-shrink-0 items-center gap-1 md:gap-3">
                        <LeftBrandChip market={snapshot.market} />
                    </div>

                    {!useBottomDock && (
                        <>
                            <div className="hidden md:flex app-header-center-nav absolute left-1/2 -translate-x-1/2">
                                <CenterNavPill profile={snapshot.profile} instanceId="desktop" />
                            </div>
                            <div className="flex md:hidden app-phone-top-nav-fallback">
                                <CenterNavPill profile={snapshot.profile} instanceId="mobile" />
                            </div>
                        </>
                    )}

                    <div className="flex flex-shrink-0 justify-end gap-2 md:gap-3 lg:gap-4">
                        <div className="flex items-center">
                            <RightActionGroup
                                profile={snapshot.profile}
                                isStaff={snapshot.isStaff}
                                accountEmail={snapshot.accountEmail}
                                unreadCount={snapshot.unreadCount}
                                notificationsPreview={snapshot.notificationsPreview}
                            />
                        </div>
                    </div>
                </div>
            </header>
            <MobileBottomDock profile={snapshot.profile} enabled={useBottomDock} />
        </>
    );
}
