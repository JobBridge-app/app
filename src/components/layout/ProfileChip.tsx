"use client";

import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { User, Building2, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProfileChipProps = {
    profile: Profile | null;
    className?: string;
    isDemo?: boolean;
};

export function ProfileChip({ profile, className, isDemo }: ProfileChipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    if (!profile) return null;

    const isCompany = profile.user_type === "company";
    const label = isCompany ? "Anbieter" : "Jobsuchend";
    const icon = isCompany ? <Building2 size={14} /> : <User size={14} />;

    // Logic for verified badge (simplistic for now)
    const isVerified = profile.is_verified;
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const { data } = await supabaseBrowser.from("user_system_roles").select("role_id").eq("user_id", profile.id).single();
            if (data) setIsStaff(true);
        };
        checkRole();
    }, [profile.id]);

    const handleLogout = async () => {
        await supabaseBrowser.auth.signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-white/20 shadow-sm transition-all duration-200 group"
            >
                {/* Avatar Circle */}
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 ring-2 ring-white/5 group-hover:ring-white/10 transition-all">
                    <span className="text-sm font-semibold">
                        {profile.full_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                    {/* Status Dot */}
                    <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A]",
                        isVerified ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                </div>

                {/* Text Info */}
                <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium text-slate-200 leading-none mb-1 max-w-[100px] truncate">
                        {profile.full_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span className={cn("text-[10px] uppercase tracking-wider font-semibold", isCompany ? "text-purple-400" : "text-blue-400")}>
                            {label}
                        </span>
                        {/* Demo Badge */}
                        {isDemo && (
                            <span className="text-[9px] px-1 py-px rounded bg-amber-500/20 text-amber-500 font-bold tracking-wider border border-amber-500/30">
                                DEMO
                            </span>
                        )}
                        {!isCompany && !isDemo && (
                            !isVerified ? <AlertCircle size={10} className="text-amber-500" /> : <CheckCircle2 size={10} className="text-emerald-500" />
                        )}
                    </div>
                </div>

                <ChevronDown size={14} className={cn("text-slate-500 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-64 p-2 bg-[#121217] border border-white/10 rounded-2xl shadow-xl shadow-black/50 backdrop-blur-3xl z-50 flex flex-col gap-1"
                        >

                            <div className="px-3 py-2 border-b border-white/5 mb-1">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Account</p>
                                    {isStaff && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">STAFF</span>}
                                </div>
                                <p className="text-sm text-slate-300 truncate">{profile.email || "Keine Email"}</p>
                            </div>

                            <Link href="/app-home/profile" onClick={() => setIsOpen(false)} className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                Profil anzeigen
                            </Link>
                            <Link href="/app-home/settings" onClick={() => setIsOpen(false)} className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                Einstellungen
                            </Link>
                            <Link href="/app-home/settings/notifications" onClick={() => setIsOpen(false)} className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                                Benachrichtigungen
                            </Link>

                            {isStaff && (
                                <>
                                    <div className="my-1 h-px bg-white/5" />
                                    <p className="px-3 pt-2 pb-1 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Staff Console</p>
                                    <Link href="/admin" onClick={() => setIsOpen(false)} className="px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors text-left font-medium">
                                        Admin Panel
                                    </Link>
                                    <button onClick={() => { /* Toggle Demo Logic */ }} className="px-3 py-2 text-sm text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors text-left w-full">
                                        {isDemo ? "Demo deaktivieren" : "Start Demo Mode"}
                                    </button>
                                </>
                            )}

                            <div className="my-1 h-px bg-white/5" />

                            <button
                                onClick={handleLogout}
                                className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left w-full"
                            >
                                Abmelden
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
