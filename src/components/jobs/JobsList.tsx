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
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden bg-white/5 rounded-2xl border border-white/10 p-1 mb-6">
                <div className="flex items-center justify-between gap-1">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={cn(
                            "flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
                            activeTab === 'active' ? "bg-indigo-500/10 text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <Briefcase size={14} /> Aktuell
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        className={cn(
                            "flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
                            activeTab === 'waitlist' ? "bg-amber-500/10 text-amber-400 shadow-sm" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <Clock size={14} /> Warteliste
                    </button>
                    <button
                        onClick={() => setActiveTab('applied')}
                        className={cn(
                            "flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
                            activeTab === 'applied' ? "bg-emerald-500/10 text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <CheckCircle2 size={14} /> Beworben
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className={cn(
                            "p-2.5 rounded-xl text-slate-500 hover:text-indigo-400 hover:bg-white/5 transition-all",
                            showFilterModal && "bg-indigo-500/10 text-indigo-400"
                        )}
                    >
                        <ListFilter size={18} />
                    </button>
                </div>
            </div>

            <div className="space-y-16 pb-20">
                {/* Active Jobs Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500", activeTab === 'active' ? "block" : "hidden lg:block")}>
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
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500 lg:animate-none", activeTab === 'waitlist' ? "block" : "hidden lg:block")}>
                    <Section
                        title="Warteliste"
                        icon={Clock}
                        colorClass="text-amber-400"
                        jobs={waitlistedJobs}
                        emptyMsg="Aktuell sind keine Jobs für die Warteliste verfügbar."
                    />
                </div>

                {/* Applied Section */}
                <div className={cn("animate-in fade-in slide-in-from-bottom-4 duration-500 lg:animate-none", activeTab === 'applied' ? "block" : "hidden lg:block")}>
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
