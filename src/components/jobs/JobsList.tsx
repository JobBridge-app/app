"use client";

import { useState } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { JobDetailModal } from "@/components/jobs/JobDetailModal";
import { Briefcase, CheckCircle2, Clock, Filter, ListFilter } from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { cn } from "@/lib/utils";

interface JobsListProps {
    activeJobs: JobsListItem[];
    waitlistedJobs: JobsListItem[];
    appliedJobs: JobsListItem[];
    isDemo: boolean;
    canApply: boolean;
    guardianStatus: string;
}

export function JobsList({ activeJobs, waitlistedJobs, appliedJobs, isDemo, canApply, guardianStatus }: JobsListProps) {
    const [selectedJob, setSelectedJob] = useState<JobsListItem | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'waitlist' | 'applied'>('active');
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Section Component for Desktop
    const Section = ({ title, icon: Icon, colorClass, jobs, emptyMsg, hiddenOnMobile, isWhiteTitle }: { title: string, icon: any, colorClass: string, jobs: JobsListItem[], emptyMsg: string, hiddenOnMobile?: boolean, isWhiteTitle?: boolean }) => (
        <div className={cn("space-y-6", hiddenOnMobile ? "hidden lg:block" : "")}>
            <h2 className={cn("text-xl font-bold flex items-center gap-3", isWhiteTitle ? "text-white" : colorClass)}>
                <div className={cn("p-2 rounded-lg border", isWhiteTitle ? "bg-white/10 border-white/10 text-indigo-400" : "bg-white/5 border-white/10")}>
                    <Icon size={20} />
                </div>
                {title}
                <span className="text-sm font-medium bg-white/10 text-slate-400 px-2.5 py-0.5 rounded-full ml-auto lg:ml-2">
                    {jobs.length}
                </span>
            </h2>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {jobs.length === 0 ? (
                    <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-white/5 bg-white/[0.02]">
                        <p className="text-slate-500 italic">{emptyMsg}</p>
                    </div>
                ) : (
                    jobs.map(job => (
                        <JobCard
                            key={job.id}
                            job={job}
                            isDemo={isDemo}
                            isApplied={title === 'Bereits Beworben'}
                            isLocked={!canApply}
                            hideStatusLabel={title === 'Bereits Beworben'}
                            onClick={() => setSelectedJob(job)}
                        />
                    ))
                )}
            </div>
        </div>
    );

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
                        {activeJobs.length > 0 && (
                            <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {activeJobs.length}
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
                {/* Active Jobs Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'active' ? "block" : "hidden")}>
                    <Section
                        title="Aktuelle Angebote"
                        icon={Briefcase}
                        colorClass="text-indigo-400"
                        jobs={activeJobs}
                        emptyMsg="Keine neuen Jobs verfügbar."
                        isWhiteTitle={true}
                    />
                </div>

                {/* Waitlist Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'waitlist' ? "block" : "hidden")}>
                    <Section
                        title="Warteliste"
                        icon={Clock}
                        colorClass="text-amber-400"
                        jobs={waitlistedJobs}
                        emptyMsg="Aktuell sind keine Jobs für die Warteliste verfügbar."
                    />
                </div>

                {/* Applied Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'applied' ? "block" : "hidden")}>
                    <Section
                        title="Bereits Beworben"
                        icon={CheckCircle2}
                        colorClass="text-emerald-400"
                        jobs={appliedJobs}
                        emptyMsg="Noch keine Bewerbungen versendet."
                    />
                </div>
            </div>

            <JobDetailModal
                job={selectedJob}
                isOpen={!!selectedJob}
                onClose={() => setSelectedJob(null)}
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
