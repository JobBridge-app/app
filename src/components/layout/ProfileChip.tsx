"use client";

import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { User, Building2, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    const [isStaff, setIsStaff] = useState(false);
    const [accountEmail, setAccountEmail] = useState<string | null | undefined>(profile?.email?.trim() || undefined);
    const router = useRouter();
    const profileId = profile?.id;

    useEffect(() => {
        const checkRole = async () => {
            if (!profileId) {
                setIsStaff(false);
                return;
            }
            const { data } = await supabaseBrowser.from("user_system_roles").select("role_id").eq("user_id", profileId).single();
            setIsStaff(!!data);
        };
        checkRole();
    }, [profileId]);

    useEffect(() => {
        let isActive = true;

        const resolveEmail = async () => {
            const profileEmail = profile?.email?.trim();
            if (profileEmail) {
                setAccountEmail(profileEmail);
                return;
            }

            try {
                const { data } = await supabaseBrowser.auth.getUser();
                if (isActive) {
                    setAccountEmail(data.user?.email?.trim() || null);
                }
            } catch {
                if (isActive) {
                    setAccountEmail(null);
                }
            }
        };

        resolveEmail();

        return () => {
            isActive = false;
        };
    }, [profile?.email, profileId]);

    if (!profile) {
        return (
            <div className={cn("relative", className)}>
                <div className="flex h-[52px] items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-[6px] md:pr-3 shadow-xl backdrop-blur-md">
                    <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
                    <div className="hidden md:flex flex-col gap-1.5">
                        <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
                        <div className="h-2 w-14 rounded bg-white/10 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const isProvider = profile.account_type === "job_provider";
    const label = isProvider ? "Jobanbieter" : "Jobsuchend";
    const RoleIcon = isProvider ? Building2 : User;

    const isVerified =
        profile.account_type === "job_provider"
            ? profile.provider_verification_status === "verified" || Boolean(profile.provider_verified_at)
            : (profile.guardian_status === "linked" && (profile as any).has_active_guardian !== false);
    // We rely on the parent to inject 'has_active_guardian' if available, otherwise fallback to status
    // But wait, if I can't inject it easily without changing types everywhere...
    // I'll check if I can just fetch it in useEffect? No, that causes layout shift.
    // Best is to update the Fetch in layout.tsx.


    const handleLogout = async () => {
        await supabaseBrowser.auth.signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <div className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={cn(
                    "group flex h-[52px] items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 pl-[6px] pr-2 shadow-xl backdrop-blur-md transition-all duration-200 md:pr-3",
                    "hover:border-white/20 hover:bg-slate-900/50",
                    isOpen && "border-white/25 bg-slate-900/55"
                )}
            >
                <div className="relative h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white/5 p-[1px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 transition-all group-hover:bg-indigo-500/25">
                        <span className="text-sm font-semibold">
                            {profile.full_name?.charAt(0).toUpperCase() || "?"}
                        </span>
                    </div>
                    <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-1 ring-slate-950",
                        isVerified ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                </div>

                <div className="hidden min-w-0 md:flex md:flex-col md:items-start md:text-left">
                    <span className="max-w-[120px] truncate text-sm font-medium leading-tight text-slate-100">
                        {profile.full_name}
                    </span>
                    <div className="mt-0.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                            <RoleIcon size={10} />
                            {label}
                        </span>
                        {isDemo && (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-px text-[9px] font-bold tracking-[0.14em] text-amber-300">
                                DEMO
                            </span>
                        )}
                        {!isProvider && !isDemo && (
                            isVerified
                                ? <CheckCircle2 size={10} className="text-emerald-500" />
                                : <AlertCircle size={10} className="text-amber-500" />
                        )}
                    </div>
                </div>

                <ChevronDown size={14} className={cn("hidden text-slate-400 transition-transform duration-200 md:block", isOpen && "rotate-180")} />
            </button>

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
                            className="absolute right-0 top-full z-50 mt-2 flex w-[18rem] flex-col gap-1 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-xl shadow-black/50 backdrop-blur-3xl"
                        >

                            <div className="mb-1 border-b border-white/10 px-3 py-2">
                                <div className="mb-1 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Account</p>
                                    {isStaff && <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300">STAFF</span>}
                                </div>
                                <p className="break-all text-sm text-slate-300">
                                    {accountEmail === undefined ? "E-Mail wird geladen..." : (accountEmail || "Keine E-Mail hinterlegt")}
                                </p>
                            </div>

                            <Link href="/app-home/profile" onClick={() => setIsOpen(false)} className="rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                                Profil anzeigen
                            </Link>

                            {isStaff && (
                                <>
                                    <div className="my-1 h-px bg-white/5" />
                                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Staff Console</p>
                                    <Link href="/admin" onClick={() => setIsOpen(false)} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300">
                                        Staff Console
                                    </Link>
                                    <Link href="/admin/demo" onClick={() => setIsOpen(false)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-amber-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400">
                                        Demo Mode
                                    </Link>
                                </>
                            )}

                            <div className="my-1 h-px bg-white/5" />

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
