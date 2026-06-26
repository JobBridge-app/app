"use client";

import { memo } from "react";
import { MapPin, Euro, Clock, Lock, CheckCircle2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";
import Link from "next/link";
import { warmJobsUI } from "@/lib/ui-warmup";
import { StaffBadge } from "@/components/ui/StaffBadge";

interface JobCardProps {
    job: JobsListItem;
    isDemo?: boolean;
    isApplied?: boolean;
    isLocked?: boolean;
    hideStatusLabel?: boolean;
    providerStatus?: "draft" | "open" | "closed" | "reviewing" | "filled" | "reserved";
    isCrossRegionalBadge?: boolean;
    onSelect?: (job: JobsListItem) => void;
    href?: string;
}

export const JobCard = memo(function JobCard({ job, isDemo, isApplied, isLocked, hideStatusLabel, providerStatus, isCrossRegionalBadge, onSelect, href }: JobCardProps) {
    const isReservedJob = job.status === 'reserved' && !providerStatus;
    const isUserWaitlisted = job.application_status === 'waitlisted';
    const showWaitlistBadges = isReservedJob && !isApplied;
    const cardState = isLocked
        ? "locked"
        : isApplied
            ? "applied"
            : isReservedJob
                ? "waitlist"
                : "open";
    const categoryTone =
        cardState === "waitlist"
            ? {
                chip: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
                icon: "text-amber-400",
            }
            : cardState === "applied"
                ? {
                    chip: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/25",
                    icon: "text-emerald-400",
                }
                : {
                    chip: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 group-hover:bg-indigo-500/15 group-hover:border-indigo-500/25",
                    icon: "text-indigo-400",
                };

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

    const handleSelect = () => {
        if (!href) {
            void warmJobsUI();
            onSelect?.(job);
        }
    };

    const CardContent = (
        <div
            data-card-state={cardState}
            onClick={handleSelect}
            onMouseEnter={() => void warmJobsUI()}
            onFocus={() => void warmJobsUI()}
            onPointerDown={() => void warmJobsUI()}
            className="job-card group relative flex h-full min-h-[236px] cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border p-6 transition-[border-color,box-shadow,background-color] duration-200 md:p-7"
        >
            {/* Locked Overlay */}
            {isLocked && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.35rem] bg-slate-950/60 opacity-100 transition-opacity duration-300 pointer-events-none sm:opacity-0 sm:group-hover:opacity-100">
                    <div className="flex flex-col items-center gap-2 transform sm:translate-y-4 sm:group-hover:translate-y-0 transition-transform duration-300">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 shadow-xl">
                            <Lock size={20} />
                        </div>
                        <span className="text-xs font-medium text-slate-300 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-center">
                            Verifizierung erforderlich
                        </span>
                    </div>
                </div>
            )}

            <div className={`relative z-10 flex flex-col h-full ${isLocked ? 'md:opacity-55 md:transition-opacity md:duration-200' : ''}`}>
                <div className="mb-5 flex flex-col gap-2.5">
                    {/* Waitlist Badges - Keep in flow if they exist so title gets pushed down naturally */}
                    {showWaitlistBadges && (
                        <div className="flex items-start mb-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {job.active_applicant && !isUserWaitlisted && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-left-2 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
                                        <Clock size={10} className="text-amber-400" />
                                        <span>Reserviert von {job.active_applicant.full_name?.split(' ')[0] || "Nutzer"}</span>
                                    </div>
                                )}
                                {isUserWaitlisted && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-left-2 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
                                        <CheckCircle2 size={10} className="text-amber-400" />
                                        <span>Du stehst auf der Warteliste</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Main Header Row: Title & Right-Aligned Badges */}
                    <div className="flex items-start justify-between gap-3">
                        {/* Title Row */}
                        <h3 className="job-card-title line-clamp-2 text-[1.35rem] font-bold leading-[1.12] tracking-[-0.01em] text-white transition-colors group-hover:text-indigo-100 md:text-[1.45rem]">
                            {job.title}
                        </h3>

                        {/* Right-Aligned Badges */}
                        {((isCrossRegionalBadge && job.market_name && !isApplied && !isReservedJob) || isLocked) && (
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                {/* Extended Job Badge */}
                                {isCrossRegionalBadge && job.market_name && !isApplied && !isReservedJob && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold uppercase tracking-wider">
                                        <MapPin size={10} className="text-violet-400" />
                                        <span>Aus {job.market_name}</span>
                                    </div>
                                )}
                                {/* Always show Lock icon in corner if locked, separate from overlay */}
                                {isLocked && <Lock size={16} className="text-slate-600 md:hidden shrink-0" />}
                            </div>
                        )}
                    </div>

                    {/* Metadata Row */}
                    <div className="job-card-meta-row flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm font-medium text-slate-400">
                        {(() => {
                            const CategoryIcon = JOB_CATEGORIES.find(c => c.id === job.category)?.icon;
                            const categoryLabel = JOB_CATEGORIES.find(c => c.id === job.category)?.label || "Sonstiges";
                            return (
                                <span className={cn(
                                    "job-card-category flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors duration-200",
                                    categoryTone.chip
                                )}>
                                    {CategoryIcon && <CategoryIcon size={12} className={cn(categoryTone.icon)} />}
                                    {categoryLabel}
                                </span>
                            );
                        })()}
                        <span className="job-card-separator text-slate-600">•</span>
                        <span className="job-card-provider text-sm font-medium text-slate-400">{job.creator?.company_name || "Privater Auftraggeber"}</span>
                        {isDemo && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 border border-cyan-400/30 px-1.5 py-0.5 rounded bg-cyan-400/10 ml-1">
                                Demo
                            </span>
                        )}
                    </div>
                </div>

                <p className="job-card-description mb-7 line-clamp-2 flex-grow text-[0.98rem] font-normal leading-7 text-slate-300/90">
                    {job.description}
                </p>

                <div className="job-card-footer mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.07] pt-5 text-sm text-slate-400">
                    <div className="job-card-metric flex min-w-0 items-center gap-2">
                        <Euro size={16} className="job-card-icon text-emerald-400" />
                        <span className="font-semibold text-white">
                            {job.payment_type === 'fixed'
                                ? `${job.wage_hourly} € pauschal`
                                : `${job.wage_hourly} € / Std.`}
                        </span>
                    </div>
                    {providerStatus ? (
                        <div className="job-card-metric flex min-w-0 items-center gap-2">
                            <MapPin size={16} className="job-card-icon text-indigo-400" />
                            <span className="truncate max-w-[150px]">
                                {job.public_location_label || job.market_name || "Privatadresse"}
                            </span>
                        </div>
                    ) : (
                        <div className="job-card-metric flex min-w-0 items-center gap-2">
                            <MapPin size={16} className={cn("job-card-icon", job.distance_km != null ? "text-indigo-400" : "text-slate-500")} />
                            {job.distance_km != null ? (
                                <span className="truncate max-w-[150px] text-white font-medium">
                                    {`${(Math.round(job.distance_km * 10) / 10).toFixed(1).replace('.', ',')} km entfernt`}
                                </span>
                            ) : (
                                <Link
                                    href="/app-home/profile?focus=location"
                                    className="flex items-center gap-1.5 group/loc relative"
                                    title="Wohnort hinzufügen für exakte Entfernungsangaben"
                                >
                                    <span className="text-slate-500 text-xs">Entfernung unbekannt</span>
                                    {/* Pulse effect wrapper */}
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-lg bg-indigo-500/20 blur-[3px] transition-all duration-300 group-hover/loc:bg-indigo-500/35" />
                                        <span className="relative text-[10px] font-bold text-indigo-100 bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded-lg transition-colors ring-1 ring-white/10 shadow-lg whitespace-nowrap">
                                            Wohnort angeben
                                        </span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    )}
                    <div className="job-card-trailing-meta ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs font-medium text-slate-500 max-sm:ml-0 max-sm:w-full max-sm:justify-start">
                        <Clock size={14} className="job-card-muted-icon text-slate-600" />
                        <span>{timeAgo(job.created_at)}</span>
                        {job.creator && (
                            <>
                                <span className="job-card-separator text-slate-700">•</span>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <div className="job-card-avatar flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-400">
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
                    </div>
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
