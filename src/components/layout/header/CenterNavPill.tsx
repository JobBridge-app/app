"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { warmRouteAdjacentUI } from "@/lib/ui-warmup";
import { endPerfMark, startPerfMark } from "@/lib/perf";
import { useAppNavigation } from "../AppNavigationProvider";
import { AppNavPendingIndicator } from "./AppNavPendingIndicator";
import { getAppNavItems } from "./navItems";

export function CenterNavPill({ profile, instanceId = "default" }: { profile: Profile | null; instanceId?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const { pendingHref, beginNavigation } = useAppNavigation();
    const isCoarsePointerRef = useRef(false);
    const warmedRoutesRef = useRef(new Set<string>());
    const currentPath = pendingHref || pathname || "";
    const committedPath = pathname || "";
    const activePillId = `active-pill-${instanceId}`;

    const navItems = getAppNavItems(profile);

    useEffect(() => {
        endPerfMark("app-header-route");
    }, [pathname]);

    useEffect(() => {
        isCoarsePointerRef.current = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    }, []);

    const warmRoute = (href: string) => {
        if (warmedRoutesRef.current.has(href)) return;
        warmedRoutesRef.current.add(href);
        router.prefetch(href);
        if (!isCoarsePointerRef.current) {
            void warmRouteAdjacentUI(href);
        }
    };

    return (
        <LayoutGroup id={`app-nav-${instanceId}`}>
            <nav
                aria-label="Hauptnavigation"
                className="app-center-nav-pill flex h-[52px] items-center gap-1 rounded-full border border-transparent p-[6px]"
            >
                {navItems.map((item) => {
                    const isActive = item.activePattern.test(currentPath);
                    const isCurrent = item.activePattern.test(committedPath);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
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
                                    startPerfMark("app-header-route");
                                }
                            }}
                            onMouseEnter={() => warmRoute(item.href)}
                            onFocus={() => warmRoute(item.href)}
                            className={cn(
                                "group relative flex h-10 min-w-10 items-center justify-center rounded-full px-3 outline-none transition-[color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none motion-reduce:active:scale-100 lg:px-5",
                                isActive
                                    ? "text-white"
                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                            aria-label={item.label}
                            aria-current={isCurrent ? "page" : undefined}
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
                            <AppNavPendingIndicator className="bottom-1" />
                        </Link>
                    );
                })}
            </nav>
        </LayoutGroup>
    );
}
