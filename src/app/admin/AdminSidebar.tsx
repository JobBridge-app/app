"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Shield,
    ArrowLeft,
    Search,
    FileText,
    Flag,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
    const pathname = usePathname();

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/admin" },
        { icon: Users, label: "Users", href: "/admin/users" },
        { icon: FileText, label: "Jobs", href: "/admin/jobs" }, // Assuming needed
        { icon: Flag, label: "Moderation", href: "/admin/moderation" },
        { icon: Shield, label: "Roles", href: "/admin/roles" },
    ];

    return (
        <aside className="hidden md:flex flex-col w-20 bg-slate-950 border-r border-white/5 items-center py-6 gap-6 z-20">
            {/* Brand Icon */}
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                <Shield className="text-white" size={20} />
            </div>

            {/* Nav Items (Icon Rail) */}
            <nav className="flex flex-col gap-4 w-full px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group relative w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-300",
                                isActive
                                    ? "bg-white/10 text-white shadow-inner"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-white/5"
                            )}
                            title={item.label}
                        >
                            <item.icon size={22} className={cn("transition-transform", isActive ? "scale-100" : "group-hover:scale-110")} />

                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom Actions */}
            <div className="flex flex-col gap-4 w-full px-2">
                <Link
                    href="/app-home"
                    className="group w-full aspect-square flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-red-500/10 transition-all"
                    title="Exit Admin"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
            </div>
        </aside>
    );
}
