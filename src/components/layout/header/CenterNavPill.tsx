"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Activity, Settings, Users, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/lib/types";
import { motion } from "framer-motion";

export function CenterNavPill({ profile }: { profile: Profile | null }) {
    const pathname = usePathname();

    // Determine Nav Items based on Role
    // Common items
    const commonItems = [
        {
            label: "Einstellungen",
            icon: Settings,
            href: "/app-home/settings",
            activePattern: /^\/app-home\/settings/,
        }
    ];

    let navItems = [];

    if (profile?.user_type === "company") {
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
    } else if (profile?.user_type === "admin") {
        navItems = [
            {
                label: "Dashboard",
                icon: Activity,
                href: "/app-home/admin",
                activePattern: /^\/app-home\/admin$|^\/app-home\/admin\/dashboard/,
            },
            {
                label: "User",
                icon: Users,
                href: "/app-home/admin/users",
                activePattern: /^\/app-home\/admin\/users/,
            },
            ...commonItems
        ];
    } else {
        // Seeker / Youth
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
        <nav className="flex items-center gap-1 p-1.5 rounded-full bg-slate-900/40 border border-white/10 shadow-xl backdrop-blur-md transition-all duration-300">
            {navItems.map((item) => {
                const isActive = item.activePattern.test(pathname);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "relative flex items-center justify-center px-5 py-2.5 rounded-full transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                            isActive
                                ? "text-white"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                        aria-label={item.label}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {/* Active Background Pill with Glow */}
                        {isActive && (
                            <motion.div
                                layoutId="active-pill"
                                className="absolute inset-0 bg-indigo-600/90 shadow-[0_0_20px_rgba(79,70,229,0.4)] rounded-full z-0"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}

                        {/* Hover Overlay (Glass) */}
                        {!isActive && (
                            <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 dark:group-hover:bg-white/5 transition-colors z-0" />
                        )}

                        {/* Content */}
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
                                isActive ? "opacity-100" : "opacity-0 w-0 hidden md:inline-block md:opacity-100 md:w-auto"
                            )}>
                                {item.label}
                            </span>
                            {/* Mobile Text: Show only if active? No, keep Icons only on strict mobile to save space, maybe tooltip later. */}
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
}
