"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
    const prefersReducedMotion = useReducedMotion() ?? false;
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
            className="app-mobile-dock-shell fixed inset-x-0 z-50 px-3 md:hidden"
        >
            <div className="mx-auto grid max-w-[22rem] grid-cols-3 gap-1 rounded-[1.25rem] border border-white/12 bg-slate-950/[0.985] p-1 shadow-[0_16px_46px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
                {navItems.map((item) => {
                    const isActive = item.activePattern.test(currentPath);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            aria-label={item.label}
                            aria-current={isActive ? "page" : undefined}
                            onPointerDown={() => activateRoute(item.href)}
                            onTouchStart={() => activateRoute(item.href)}
                            onMouseEnter={() => warmRoute(item.href)}
                            onFocus={() => warmRoute(item.href)}
                            onClick={() => activateRoute(item.href)}
                            className={cn(
                                "group relative flex h-[2.8rem] min-w-0 items-center justify-center rounded-[0.92rem] text-slate-500 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-300/45",
                                isActive ? "text-white" : "hover:text-slate-200"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-dock-active"
                                    className="absolute inset-0 rounded-[0.92rem] bg-blue-500/14 shadow-[0_10px_28px_rgba(37,99,235,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]"
                                    initial={false}
                                    transition={prefersReducedMotion ? { duration: 0.12 } : {
                                        type: "spring",
                                        stiffness: 520,
                                        damping: 36,
                                        mass: 0.7,
                                    }}
                                />
                            )}
                            <span className="relative z-10 flex min-w-0 flex-col items-center justify-center gap-1">
                                <item.icon
                                    size={18}
                                    strokeWidth={2.4}
                                    className={cn(
                                        "transition-[color,transform] duration-150",
                                        isActive ? "text-blue-100" : "text-slate-500 group-hover:text-slate-300"
                                    )}
                                />
                                <span className={cn(
                                    "max-w-full truncate text-[10.5px] font-semibold leading-none tracking-tight",
                                    isActive ? "text-slate-100" : "text-slate-500 group-hover:text-slate-300"
                                )}>
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
