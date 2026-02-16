"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Shield,
    ArrowLeft,
    FileText,
    Flag,
    Settings,
    Gift,
    Clock,
    MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
// Navigation items for the admin sidebar
export const adminNavItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/staff" },
    { icon: Users, label: "Users", href: "/staff/users" },
    { icon: Briefcase, label: "Jobs", href: "/staff/jobs" },
    { icon: FileText, label: "Applications", href: "/staff/applications" },
    { icon: Flag, label: "Moderation", href: "/staff/moderation" },
    { icon: Clock, label: "Activity", href: "/staff/activity" },
    { icon: Gift, label: "Drops", href: "/staff/drops" },
    { icon: Shield, label: "Roles", href: "/staff/roles" },
    { icon: MessageSquare, label: "Communications", href: "/staff/communications" },
    { icon: Settings, label: "Demo Mode", href: "/staff/demo" },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-20 bg-slate-950 border-r border-white/5 items-center py-6 gap-6 z-20 h-screen sticky top-0">
            {/* Brand Icon */}
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 shrink-0">
                <Shield className="text-white" size={20} />
            </div>

            {/* Nav Items (Icon Rail) - Scrollable */}
            <nav className="flex flex-col gap-4 w-full px-2 flex-1 overflow-y-auto min-h-0 no-scrollbar">
                {adminNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/staff" && pathname.startsWith(item.href));
                    return (
                        <Tooltip key={item.href} text={item.label} side="right">
                            <Link
                                href={item.href}
                                className={cn(
                                    "group relative w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-300 shrink-0",
                                    isActive
                                        ? "bg-white/10 text-white shadow-inner"
                                        : "text-slate-500 hover:text-indigo-400 hover:bg-white/5"
                                )}
                            >
                                <item.icon size={22} className={cn("transition-transform", isActive ? "scale-100" : "group-hover:scale-110")} />

                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                )}
                            </Link>
                        </Tooltip>
                    );
                })}
            </nav>

            {/* Bottom Actions - Pinned */}
            <div className="flex flex-col gap-4 w-full px-2 shrink-0 pt-4 border-t border-white/5">
                <Tooltip text="Exit to App" side="right">
                    <Link
                        href="/app-home"
                        className="group relative w-full aspect-square flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-red-500/10 transition-all"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                </Tooltip>
            </div>
        </aside>
    );
}
