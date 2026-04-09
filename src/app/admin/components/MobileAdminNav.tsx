"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowLeft, LayoutDashboard, Users, Briefcase, FileText, Flag, Settings, Gift, Clock, MessageSquare, Shield, BarChart3, Lock } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { StaffBadge } from "@/components/ui/StaffBadge";
import {
    getAdminNavGroupsWithAccess,
    formatStaffRole,
    type AdminIconKey
} from "@/lib/adminNavigation";
import type { StaffRole } from "@/lib/data/adminTypes";

export function MobileAdminNav({ highestRole }: { highestRole: StaffRole }) {
    const [isOpen, setIsOpen] = useState(false);
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

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-white/5 z-30 relative">
                <div className="flex items-center gap-2.5">
                    <div className="relative w-6 h-6 shrink-0">
                        <Image
                            src="/logo2-jobbridge.png"
                            alt="JobBridge"
                            fill
                            className="object-contain scale-150"
                            priority
                        />
                    </div>
                    <span className="font-bold text-white text-sm">JobBridge</span>
                    <StaffBadge className="px-2 py-0.5 text-[11px]" />
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Menü öffnen"
                >
                    <Menu size={18} />
                </button>
            </header>

            {/* Slide-out Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Sidebar Drawer */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-72 bg-slate-950 border-r border-white/8 z-50 flex flex-col md:hidden"
                        >
                            {/* Drawer Header */}
                            <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative w-6 h-6 shrink-0">
                                        <Image
                                            src="/logo2-jobbridge.png"
                                            alt="JobBridge"
                                            fill
                                            className="object-contain scale-150"
                                        />
                                    </div>
                                    <span className="font-bold text-white text-sm">JobBridge</span>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    aria-label="Menü schließen"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Navigation Links mit Gruppen */}
                            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
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
                                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                                            isActive
                                                                ? "bg-indigo-500/10 text-white border border-indigo-500/15"
                                                                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                                        )}
                                                    >
                                                        <Icon
                                                            size={16}
                                                            className={cn(
                                                                "shrink-0",
                                                                isActive ? "text-indigo-400" : "text-slate-500"
                                                            )}
                                                        />
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/5 space-y-3">
                                <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3">
                                    <p className="text-sm font-medium text-white">{formatStaffRole(highestRole)}</p>
                                </div>
                                <Link
                                    href="/app-home"
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-red-500/8 border border-transparent hover:border-red-500/10 transition-colors group"
                                >
                                    <ArrowLeft size={16} className="shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                                    Exit Admin
                                </Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
