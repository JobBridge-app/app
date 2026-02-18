"use client";

import { memo } from "react";
import { Building2, MapPin, Euro, Clock, Lock } from "lucide-react";
import type { Database } from "@/lib/types/supabase";
import { timeAgo } from "@/lib/utils";
import type { JobsListItem } from "@/lib/types/jobbridge";

import Link from "next/link";

interface JobCardProps {
    job: JobsListItem;
    isDemo?: boolean;
    isApplied?: boolean;
    isLocked?: boolean;
    hideStatusLabel?: boolean;
    providerStatus?: "draft" | "open" | "closed" | "reviewing" | "filled" | "reserved";
    onSelect?: (job: JobsListItem) => void;
    href?: string;
}

export const JobCard = memo(function JobCard({ job, isDemo, isApplied, isLocked, hideStatusLabel, providerStatus, onSelect, href }: JobCardProps) {
    const getStatusBadge = () => {
        if (providerStatus) {
            switch (providerStatus) {
                case 'draft':
                    return (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 border border-slate-400/30 px-1.5 py-0.5 rounded bg-white/5 ml-2">
                            Entwurf
                        </span>
                    );
                case 'closed':
                    return (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 border border-slate-400/30 px-1.5 py-0.5 rounded bg-white/5 ml-2">
                            Geschlossen
                        </span>
                    );
                case 'filled':
                    return (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 border border-blue-400/30 px-1.5 py-0.5 rounded bg-blue-400/10 ml-2">
                            Vergeben
                        </span>
                    );
                case 'reviewing':
                    return (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400 border border-purple-400/30 px-1.5 py-0.5 rounded bg-purple-400/10 ml-2">
                            In Prüfung
                        </span>
                    );
                case 'reserved':
                    return (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded bg-amber-400/10 ml-2">
                            Reserviert
                        </span>
                    );
                case 'open':
                    return null; // Standard
            }
        }
        if (isApplied && !hideStatusLabel) {
            return (
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded bg-emerald-400/10 ml-2 flex items-center gap-1">
                    Bereits beworben
                </span>
            );
        }
        if (job.status === "draft") {
            return (
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 border border-slate-400/30 px-1.5 py-0.5 rounded bg-white/5 ml-2">
                    Entwurf
                </span>
            );
        }
        if (job.status === "closed") {
            return (
                <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded bg-red-400/10 ml-2">
                    Geschlossen
                </span>
            );
        }
        if (job.status === "open") {
            return (
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded bg-emerald-400/10 ml-2">
                    Aktiv
                </span>
            );
        }
        if (job.status === "reserved") {
            return (
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded bg-amber-400/10 ml-2">
                    Warteliste verfügbar
                </span>
            );
        }
        return null;
    };

    const CardContent = (
        <div
            onClick={(e) => {
                if (!href) {
                    onSelect?.(job);
                }
            }}
            className={`group relative overflow-hidden rounded-2xl border bg-slate-900/40 p-6 transition-all duration-300 sm:hover:-translate-y-1 cursor-pointer
                ${isApplied
                    ? "bg-slate-900/50 grayscale-[0.5] hover:grayscale-0 hover:bg-slate-900/80 border-white/5"
                    : isLocked
                        ? "bg-slate-900/40 border-white/[0.05] hover:border-white/10" // Locked style
                        : "bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 border-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_8px_40px_-12px_rgba(99,102,241,0.25)]"
                }
            `}
        >
            {/* Locked Overlay (Desktop Only) */}
            {isLocked && (
                <div className="hidden md:absolute md:inset-0 md:z-20 md:flex md:items-center md:justify-center md:bg-slate-950/60 md:backdrop-blur-[2px] md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:duration-300">
                    <div className="flex flex-col items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 shadow-xl">
                            <Lock size={20} />
                        </div>
                        <span className="text-xs font-medium text-slate-300 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10">
                            Freischalten
                        </span>
                    </div>
                </div>
            )}

            {/* Premium Gradient Accent Line */}
            {!isApplied && !isLocked && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}

            {/* Subtle Glow at bottom */}
            {!isApplied && !isLocked && (
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-indigo-900/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}

            <div className={`relative z-10 flex flex-col h-full ${isLocked ? 'md:opacity-50 md:blur-[1px] md:group-hover:blur-sm transition-all duration-300' : ''}`}>
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-400 border border-indigo-500/10 group-hover:from-indigo-500/25 group-hover:to-violet-500/15 group-hover:border-indigo-500/25 group-hover:text-indigo-300 transition-all duration-300">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight mb-1 group-hover:text-indigo-100 transition-colors">
                                {job.title}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                {job.creator?.company_name || "Privater Auftraggeber"}
                                {isDemo && (
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 border border-cyan-400/30 px-1.5 py-0.5 rounded bg-cyan-400/10 ml-2">
                                        Demo
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    {/* Always show Lock icon in corner if locked, separate from overlay */}
                    {isLocked && <Lock size={16} className="text-slate-600 md:hidden" />}
                </div>

                <p className="text-slate-300 text-base line-clamp-2 mb-6 leading-relaxed flex-grow font-light">
                    {job.description}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-auto pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <Euro size={16} className="text-emerald-400" />
                        <span className="font-semibold text-white">{job.wage_hourly} € / Std.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-400" />
                        <span className="truncate max-w-[150px]">{job.public_location_label || job.market_name || "Standort unbekannt"}</span>
                    </div>
                    {job.distance_km != null && (
                        <div className="flex items-center gap-2 ml-auto text-xs text-slate-500 font-medium">
                            <Clock size={14} className="text-slate-600" />
                            <span>{timeAgo(job.created_at)}</span>
                            {job.creator && (
                                <>
                                    <span className="text-slate-700">•</span>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-400 overflow-hidden">
                                            {job.creator.avatar_url ? (
                                                <img src={job.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (job.creator.company_name || job.creator.full_name || "?")[0].toUpperCase()
                                            )}
                                        </div>
                                        <span className="truncate max-w-[100px]">
                                            {job.creator.company_name || job.creator.full_name || "Unbekannt"}
                                        </span>
                                    </div>
                                </>
                            )}
                            {/* Original distance_km display, integrated if still desired */}
                            {job.distance_km != null && (
                                <>
                                    <span className="text-slate-700">•</span>
                                    <span className="text-slate-500">{Math.round(job.distance_km * 10) / 10} km</span>
                                </>
                            )}
                        </div>
                    )}
                </div>


            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href}>
                {CardContent}
            </Link>
        );
    }

    return CardContent;
});
