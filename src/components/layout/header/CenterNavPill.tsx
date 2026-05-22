"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { warmRouteAdjacentUI } from "@/lib/ui-warmup";
import { endPerfMark, startPerfMark } from "@/lib/perf";
import { getAppNavItems } from "./navItems";

export function CenterNavPill({ profile, instanceId = "default" }: { profile: Profile | null; instanceId?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const isCoarsePointerRef = useRef(false);
    const currentPath = pendingHref || pathname || "";
    const activePillId = `active-pill-${instanceId}`;

    const navItems = getAppNavItems(profile);

    useEffect(() => {
        setPendingHref(null);
        endPerfMark("app-header-route");
    }, [pathname]);

    useEffect(() => {
        isCoarsePointerRef.current = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    }, []);

    const warmRoute = (href: string) => {
        router.prefetch(href);
        if (!isCoarsePointerRef.current) {
            void warmRouteAdjacentUI(href);
        }
    };

    const activateRoute = (href: string) => {
        startPerfMark("app-header-route");
        setPendingHref(href);
    };

    return (
        <nav className="app-center-nav-pill flex h-[52px] items-center gap-1 rounded-full border p-[6px] shadow-xl backdrop-blur-md">
            {navItems.map((item) => {
                const isActive = item.activePattern.test(currentPath);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        prefetch
                        onClick={() => activateRoute(item.href)}
                        onMouseEnter={() => warmRoute(item.href)}
                        onFocus={() => warmRoute(item.href)}
                        onTouchStart={() => warmRoute(item.href)}
                        onPointerDown={() => {
                            warmRoute(item.href);
                            activateRoute(item.href);
                        }}
                        className={cn(
                            "group relative flex h-10 items-center justify-center rounded-full px-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:px-5",
                            isActive
                                ? "text-white"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                        aria-label={item.label}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={activePillId}
                                className="app-center-nav-active absolute inset-0 z-0 rounded-full"
                                initial={false}
                                style={{ willChange: "transform" }}
                                transition={{
                                    type: "spring",
                                    stiffness: 420,
                                    damping: 28,
                                    mass: 0.9,
                                }}
                            />
                        )}

                        {!isActive && (
                            <div className="absolute inset-0 z-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/5" />
                        )}

                        <div className="relative z-10 flex items-center gap-2">
                            <item.icon
                                size={18}
                                strokeWidth={2.5}
                                className={cn(
                                    "transition-transform duration-150",
                                    isActive ? "scale-100" : "opacity-70 group-hover:scale-105 group-hover:opacity-100"
                                )}
                            />
                            <span className={cn(
                                "font-medium text-sm",
                                isActive ? "opacity-100 hidden md:inline-block" : "opacity-0 w-0 hidden"
                            )}>
                                {item.label}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
}
