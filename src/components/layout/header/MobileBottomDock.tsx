"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { endPerfMark, startPerfMark } from "@/lib/perf";
import { warmRouteAdjacentUI } from "@/lib/ui-warmup";
import { usePhoneDevice } from "@/hooks/use-phone-device";
import { useAppNavigation } from "../AppNavigationProvider";
import { AppNavPendingIndicator } from "./AppNavPendingIndicator";
import { getAppNavItems } from "./navItems";

export function MobileBottomDock({ profile, enabled }: { profile: Profile | null; enabled: boolean }) {
    const isPhoneDevice = usePhoneDevice();
    const pathname = usePathname();
    const router = useRouter();
    const { pendingHref, beginNavigation } = useAppNavigation();
    const currentPath = pendingHref || pathname || "";
    const committedPath = pathname || "";
    const navItems = getAppNavItems(profile);
    const warmedRoutesRef = useRef(new Set<string>());

    useEffect(() => {
        endPerfMark("app-mobile-dock-route");
    }, [pathname]);

    if (!enabled || !isPhoneDevice) {
        return null;
    }

    const warmRoute = (href: string) => {
        if (warmedRoutesRef.current.has(href)) return;
        warmedRoutesRef.current.add(href);
        router.prefetch(href);
        void warmRouteAdjacentUI(href);
    };

    return (
        <nav
            aria-label="Hauptnavigation"
            className="app-mobile-dock-shell fixed inset-x-0 z-50 md:hidden"
        >
            <div className="app-mobile-dock-panel mx-auto grid grid-cols-3">
                {navItems.map((item) => {
                    const isActive = item.activePattern.test(currentPath);
                    const isCurrent = item.activePattern.test(committedPath);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-label={item.label}
                            aria-current={isCurrent ? "page" : undefined}
                            onClick={(event) => {
                                const isPlainPrimaryClick = event.button === 0
                                    && !event.metaKey
                                    && !event.ctrlKey
                                    && !event.shiftKey
                                    && !event.altKey;
                                if (isCurrent && isPlainPrimaryClick) {
                                    beginNavigation(item.href);
                                }
                            }}
                            onNavigate={() => {
                                beginNavigation(item.href);
                                if (!isCurrent) {
                                    startPerfMark("app-mobile-dock-route");
                                }
                            }}
                            onMouseEnter={() => warmRoute(item.href)}
                            onFocus={() => warmRoute(item.href)}
                            className={cn(
                                "app-mobile-dock-item group relative flex min-w-0 items-center justify-center outline-none",
                                isActive && "is-active"
                            )}
                        >
                            {isActive && (
                                <div className="app-mobile-dock-active absolute" />
                            )}
                            <span className="app-mobile-dock-content relative z-10 flex min-w-0 flex-col items-center justify-center">
                                <item.icon
                                    size={19}
                                    strokeWidth={2.4}
                                    className="app-mobile-dock-icon transition-colors duration-150"
                                />
                                <span className="app-mobile-dock-label max-w-full truncate">
                                    {item.label}
                                </span>
                            </span>
                            <AppNavPendingIndicator className="bottom-1.5" />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
