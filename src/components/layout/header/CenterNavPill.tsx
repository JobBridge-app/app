"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/lib/types";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type NavItem = {
    label: string;
    icon: LucideIcon;
    href: string;
    activePattern: RegExp;
};

export function CenterNavPill({ profile, instanceId = "default" }: { profile: Profile | null; instanceId?: string }) {
    const pathname = usePathname();
    const currentPath = pathname || "";
    const activePillId = `active-pill-${instanceId}`;

    const commonItems: NavItem[] = [
        {
            label: "Einstellungen",
            icon: Settings,
            href: "/app-home/settings",
            activePattern: /^\/app-home\/settings/,
        }
    ];

    let navItems: NavItem[] = [];

    const isProvider = profile?.account_type === "job_provider";

    if (isProvider) {
        navItems = [
            {
                label: "Jobs",
                icon: Briefcase,
                href: "/app-home/offers",
                activePattern: /^\/app-home\/offers/,
            },
            {
                label: "Aktivität",
                icon: Activity,
                href: "/app-home/activities",
                activePattern: /^\/app-home\/activities/,
            },
            ...commonItems
        ];
    } else {
        navItems = [
            {
                label: "Jobs",
                icon: Briefcase,
                href: "/app-home/jobs",
                activePattern: /^\/app-home\/jobs/,
            },
            {
                label: "Aktivität",
                icon: Activity,
                href: "/app-home/activities",
                activePattern: /^\/app-home\/activities/,
            },
            ...commonItems
        ];
    }


    return (
        <nav className="flex h-[52px] items-center gap-1 rounded-full border border-white/10 bg-slate-900/40 p-[6px] shadow-xl backdrop-blur-md transition-all duration-300">
            {navItems.map((item) => {
                const isActive = item.activePattern.test(currentPath);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "group relative flex h-10 items-center justify-center rounded-full px-3 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:px-5",
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
                                className="absolute inset-0 z-0 rounded-full bg-indigo-600/90 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}

                        {!isActive && (
                            <div className="absolute inset-0 z-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/10 dark:group-hover:bg-white/5" />
                        )}

                        <div className="relative z-10 flex items-center gap-2">
                            <item.icon
                                size={18}
                                strokeWidth={2.5}
                                className={cn(
                                    "transition-transform duration-300",
                                    isActive ? "scale-100" : "group-hover:scale-110 opacity-70 group-hover:opacity-100"
                                )}
                            />
                            <span className={cn(
                                "font-medium text-sm transition-all duration-300",
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
