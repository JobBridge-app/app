"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
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
        <LayoutGroup id={`app-nav-${instanceId}`}>
            <nav
                aria-label="Hauptnavigation"
                className="app-center-nav-pill flex h-[52px] items-center gap-1 rounded-full border border-transparent p-[6px]"
            >
                {navItems.map((item) => {
                    const isActive = item.activePattern.test(currentPath);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            onClick={(event) => {
                                if (event.detail === 0) activateRoute(item.href);
                            }}
                            onMouseEnter={() => warmRoute(item.href)}
                            onFocus={() => warmRoute(item.href)}
                            onPointerDown={() => {
                                warmRoute(item.href);
                                activateRoute(item.href);
                            }}
                            className={cn(
                                "group relative flex h-10 min-w-10 items-center justify-center rounded-full px-3 outline-none transition-[color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none motion-reduce:active:scale-100 lg:px-5",
                                isActive
                                    ? "text-white"
                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                            aria-label={item.label}
                            aria-current={isActive ? "page" : undefined}
                            data-active={isActive}
                        >
                            {isActive ? (
                                <motion.span
                                    layoutId={activePillId}
                                    initial={false}
                                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                                    className="app-center-nav-active absolute inset-0 z-0 rounded-full"
                                />
                            ) : (
                                <span className="app-center-nav-hover absolute inset-0 z-0 rounded-full" />
                            )}

                            <span className="relative z-10 flex items-center gap-2">
                                <span
                                    className={cn(
                                        "flex items-center justify-center transition-[opacity,scale] duration-150 ease-out",
                                        isActive ? "scale-100 opacity-100" : "opacity-70 group-hover:scale-105 group-hover:opacity-100"
                                    )}
                                >
                                    <item.icon size={18} strokeWidth={2.5} />
                                </span>
                                <span className={cn(
                                    "hidden text-sm font-medium lg:inline-block",
                                    isActive ? "opacity-100" : "w-0 overflow-hidden opacity-0"
                                )}>
                                    {item.label}
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </LayoutGroup>
    );
}
