"use client";

import { useState, useCallback, useMemo } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { JobsListSection } from "@/components/jobs/JobsListSection";
import { JobDetailModal } from "@/components/jobs/JobDetailModal";
import { Briefcase, CheckCircle2, Clock, Filter, ListFilter, MapPin } from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { cn } from "@/lib/utils";

interface JobsListProps {
    localActiveJobs: JobsListItem[];
    extendedActiveJobs: JobsListItem[];
    waitlistedJobs: JobsListItem[];
    appliedJobs: JobsListItem[];
    isDemo: boolean;
    canApply: boolean;
    guardianStatus: string;
}

export function JobsList({ localActiveJobs, extendedActiveJobs, waitlistedJobs, appliedJobs, isDemo, canApply, guardianStatus }: JobsListProps) {
    const [selectedJob, setSelectedJob] = useState<JobsListItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'waitlist' | 'applied'>('active');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const handleJobSelect = useCallback((job: JobsListItem) => {
        setSelectedJob(job);

        setIsDetailOpen(true);
    }, []);

    return (
        <>
            {/* --- Mobile Navigation (Rounded Card "Job Card Style") --- */}
            <div className="flex justify-center mb-6 md:hidden w-full">
                {/* Background matches JobCard: bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 border-white/[0.08] */}
                <div className="flex items-center justify-between w-full bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 border border-white/[0.08] rounded-2xl p-1 shadow-sm">
                    {/* Tabs (Optimized for space) */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-gradient-right flex-1 min-w-0">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={cn(
                                "relative px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
                                activeTab === 'active'
                                    ? "bg-indigo-500/10 text-indigo-400 shadow-sm border border-indigo-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <Briefcase size={15} />
                            <span>Aktuell</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('waitlist')}
                            className={cn(
                                "relative px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap",
                                activeTab === 'waitlist'
                                    ? "bg-amber-500/10 text-amber-400 shadow-sm border border-amber-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <Clock size={15} />
                            <span>Warteliste</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('applied')}
                            className={cn(
                                "relative px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap",
                                activeTab === 'applied'
                                    ? "bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <CheckCircle2 size={15} />
                            <span>Beworben</span>
                        </button>
                    </div>

                    {/* Vertical Separator */}
                    <div className="w-px h-8 bg-white/10 mx-0.5 shrink-0" />

                    {/* Filter Icon */}
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className={cn(
                            "h-full aspect-square flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0 ml-0.5",
                            showFilterModal && "text-indigo-400 bg-white/5"
                        )}
                        style={{ height: '36px', width: '36px' }}
                    >
                        <ListFilter size={18} />
                    </button>
                </div>
            </div>

            {/* --- Desktop Navigation (Integrated) --- */}
            <div className="hidden md:flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                {/* Scrollable Tabs Container */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-gradient-right pr-4 -mr-4 md:mr-0 md:pr-0 md:mask-none">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={cn(
                            "py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
                            activeTab === 'active'
                                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Briefcase size={16} className={cn(activeTab === 'active' ? "text-indigo-400" : "text-slate-500")} />
                        Aktuell
                        {(localActiveJobs.length + extendedActiveJobs.length) > 0 && (
                            <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {localActiveJobs.length + extendedActiveJobs.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        className={cn(
                            "py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
                            activeTab === 'waitlist'
                                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Clock size={16} className={cn(activeTab === 'waitlist' ? "text-amber-400" : "text-slate-500")} />
                        Warteliste
                        {waitlistedJobs.length > 0 && (
                            <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {waitlistedJobs.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('applied')}
                        className={cn(
                            "py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
                            activeTab === 'applied'
                                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <CheckCircle2 size={16} className={cn(activeTab === 'applied' ? "text-emerald-400" : "text-slate-500")} />
                        Beworben
                        {appliedJobs.length > 0 && (
                            <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {appliedJobs.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter Button (Right Aligned) */}
                <button
                    onClick={() => setShowFilterModal(true)}
                    className={
                        cn(
                            "ml-4 py-2 px-3 sm:px-4 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 whitespace-nowrap border border-transparent hover:border-white/10",
                            showFilterModal && "bg-white/10 text-indigo-400 border-indigo-500/20"
                        )}
                    title="Filter & Sortierung"
                >
                    <ListFilter size={18} />
                    <span className="hidden sm:inline text-xs sm:text-sm font-medium">Filter</span>
                </button>
            </div>

            <div className="space-y-16 pb-20">
                {/* Active Jobs Section (Local + Extended) */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'active' ? "block" : "hidden")}>
                    {/* Local Jobs */}
                    <div className="mb-12">
                        <JobsListSection
                            title="Lokale Angebote"
                            icon={Briefcase}
                            colorClass="text-indigo-400"
                            jobs={localActiveJobs}
                            emptyMsg={
                                <div className="flex flex-col items-center justify-center space-y-4 py-8 px-4 animate-in fade-in duration-700">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-110 pointer-events-none" />
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-white/[0.05] flex items-center justify-center shadow-xl relative z-10 text-indigo-400/80">
                                            <Briefcase size={32} className="opacity-80" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-white tracking-tight">Aktuell keine lokalen Jobs</h3>
                                        <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                                            {extendedActiveJobs.length > 0
                                                ? "Aber gute Neuigkeiten! Entdecke unten spannende überregionale Angebote aus benachbarten Städten."
                                                : "In deiner Stadt wird gerade keine Unterstützung gesucht. Schau später noch einmal vorbei!"}
                                        </p>
                                    </div>
                                </div>
                            }
                            isWhiteTitle={true}
                            isDemo={isDemo}
                            canApply={canApply}
                            hideStatusLabel={true}
                            onSelect={handleJobSelect}
                        />
                    </div>

                    {/* Extended Jobs */}
                    {extendedActiveJobs.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
                            {/* Premium Divider */}
                            <div className="relative flex items-center justify-center my-12 mb-14">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-white/[0.08]" />
                                </div>
                                <div className="absolute w-full flex justify-center">
                                    <div className="w-1/2 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                                </div>
                                <div className="relative flex justify-center z-10">
                                    <span className="bg-[#09090b] px-6 text-sm flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse" />
                                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300 tracking-wider uppercase text-xs">
                                            Jobs aus anderen Regionen
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <JobsListSection
                                title="Überregionale Angebote"
                                icon={MapPin}
                                colorClass="text-violet-400"
                                jobs={extendedActiveJobs}
                                emptyMsg=""
                                isWhiteTitle={false}
                                isDemo={isDemo}
                                canApply={canApply}
                                hideStatusLabel={true}
                                isExtendedSection={true}
                                onSelect={handleJobSelect}
                            />
                        </div>
                    )}
                </div>

                {/* Waitlist Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'waitlist' ? "block" : "hidden")}>
                    <JobsListSection
                        title="Warteliste"
                        icon={Clock}
                        colorClass="text-amber-400"
                        jobs={waitlistedJobs}
                        emptyMsg="Aktuell sind keine Jobs für die Warteliste verfügbar."
                        isDemo={isDemo}
                        canApply={canApply}
                        hideStatusLabel={true}
                        onSelect={handleJobSelect}
                    />
                </div>

                {/* Applied Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'applied' ? "block" : "hidden")}>
                    <JobsListSection
                        title="Bereits Beworben"
                        icon={CheckCircle2}
                        colorClass="text-emerald-400"
                        jobs={appliedJobs}
                        emptyMsg="Noch keine Bewerbungen versendet."
                        isDemo={isDemo}
                        canApply={canApply}
                        hideStatusLabel={true}
                        onSelect={handleJobSelect}
                    />
                </div>
            </div>

            <JobDetailModal
                job={selectedJob}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onClosed={() => setSelectedJob(null)}
                canApply={canApply}
                guardianStatus={guardianStatus}
            />

            {/* Filter Modal (Coming Soon) */}
            {showFilterModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilterModal(false)} />
                    <div className="relative w-full max-w-sm bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full sm:hidden" />

                        <div className="text-center space-y-4 pt-4 sm:pt-0">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400 mb-2">
                                <ListFilter size={24} />
                            </div>

                            <h3 className="text-lg font-bold text-white">Filter & Sortierung</h3>

                            <p className="text-slate-400 text-sm leading-relaxed">
                                Erweiterte Funktionen wie Sortierung, Reihenfolgemodus und Wettbewerbsanalysen sind bald verfügbar.
                            </p>

                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 transition-colors mt-4"
                            >
                                Verstanden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
