"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
    MessageSquare,
    BarChart3,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StaffBadge } from "@/components/ui/StaffBadge";
import {
    formatStaffRole,
    getAdminNavGroupsWithAccess,
    type AdminIconKey
} from "@/lib/adminNavigation";
import type { StaffRole } from "@/lib/data/adminTypes";

type AdminSidebarProps = {
    userFullName: string;
    userInitials: string;
    highestRole: StaffRole;
};

export function AdminSidebar({ userFullName, userInitials, highestRole }: AdminSidebarProps) {
    const pathname = usePathname();
    const navGroups = getAdminNavGroupsWithAccess(highestRole);

    const iconMap: Record<AdminIconKey, React.ElementType> = {
        dashboard: LayoutDashboard,
        chart: BarChart3,
        users: Users,
        jobs: Briefcase,
        applications: FileText,
        moderation: Flag,
        activity: Clock,
        communications: MessageSquare,
        drops: Gift,
        roles: Shield,
        demo: Settings,
    };

    return (
        <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-white/5 z-20 h-screen sticky top-0 shrink-0">
            {/* Logo / Brand */}
            <div className="px-4 py-5 border-b border-white/5">
                <Link href="/staff" className="flex items-center gap-2.5">
                    <div className="relative w-9 h-9 shrink-0">
                        <Image
                            src="/logo2-jobbridge.png"
                            alt="JobBridge"
                            fill
                            className="object-contain scale-150"
                            priority
                        />
                    </div>
                    <span className="font-bold text-white text-[15px] tracking-tight">JobBridge</span>
                    <StaffBadge className="ml-auto px-2 py-0.5 text-[11px]" />
                </Link>
            </div>

            {/* Nav Groups — Scrollable */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 no-scrollbar">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className={cn(
                            "text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5",
                            group.accessible ? "text-slate-600" : "text-slate-700"
                        )}>
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = iconMap[item.icon];
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/staff" && pathname.startsWith(item.href));

                                if (!group.accessible) {
                                    return (
                                        <div
                                            key={item.href}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-transparent cursor-not-allowed"
                                            aria-disabled="true"
                                        >
                                            <Icon size={16} className="shrink-0 text-slate-700" />
                                            <span className="flex-1">{item.label}</span>
                                            <Lock size={13} className="shrink-0 text-slate-600" />
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                            isActive
                                                ? "bg-indigo-500/10 text-white border border-indigo-500/15"
                                                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />
                                        )}
                                        <Icon
                                            size={16}
                                            className={cn(
                                                "shrink-0",
                                                isActive ? "text-indigo-400" : "text-slate-500"
                                            )}
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer — User Info + Exit */}
            <div className="border-t border-white/5 p-3 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/25 border border-indigo-500/25 flex items-center justify-center text-[11px] font-bold text-indigo-300 shrink-0 uppercase">
                        {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate leading-tight">{userFullName}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">
                            {formatStaffRole(highestRole)}
                        </p>
                    </div>
                </div>

                <Link
                    href="/app-home"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-red-500/8 border border-transparent hover:border-red-500/10 transition-all group"
                >
                    <ArrowLeft
                        size={16}
                        className="shrink-0 group-hover:-translate-x-0.5 transition-transform"
                    />
                    <span>Exit Admin</span>
                </Link>
            </div>
        </aside>
    );
}
