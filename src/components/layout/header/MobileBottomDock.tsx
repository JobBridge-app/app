"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { endPerfMark, startPerfMark } from "@/lib/perf";
import { warmRouteAdjacentUI } from "@/lib/ui-warmup";
import { usePhoneDevice } from "@/hooks/use-phone-device";
import { getAppNavItems } from "./navItems";

export function MobileBottomDock({ profile, enabled }: { profile: Profile | null; enabled: boolean }) {
    const isPhoneDevice = usePhoneDevice();
    const pathname = usePathname();
    const router = useRouter();
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const currentPath = pendingHref || pathname || "";
    const navItems = getAppNavItems(profile);
    const warmedRoutesRef = useRef(new Set<string>());

    useEffect(() => {
        setPendingHref(null);
        endPerfMark("app-mobile-dock-route");
    }, [pathname]);

    if (!enabled || !isPhoneDevice) {
        return null;
    }

    const warmRoute = (href: string) => {
        router.prefetch(href);
        if (!warmedRoutesRef.current.has(href)) {
            warmedRoutesRef.current.add(href);
            void warmRouteAdjacentUI(href);
        }
    };

    const activateRoute = (href: string) => {
        startPerfMark("app-mobile-dock-route");
        setPendingHref(href);
        warmRoute(href);
    };

    return (
        <nav
            aria-label="Hauptnavigation"
            className="app-mobile-dock-shell fixed inset-x-0 z-50 md:hidden"
        >
            <div className="app-mobile-dock-panel mx-auto grid grid-cols-3">
                {navItems.map((item) => {
                    const isActive = item.activePattern.test(currentPath);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            aria-label={item.label}
                            aria-current={isActive ? "page" : undefined}
                            onPointerDown={() => activateRoute(item.href)}
                            onTouchStart={() => activateRoute(item.href)}
                            onMouseEnter={() => warmRoute(item.href)}
                            onFocus={() => warmRoute(item.href)}
                            onClick={() => activateRoute(item.href)}
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
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
