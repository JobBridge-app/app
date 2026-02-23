"use client";

import { useState, useCallback, useMemo } from "react";
import { JobsListSection } from "@/components/jobs/JobsListSection";
import { JobDetailModal } from "@/components/jobs/JobDetailModal";
import { Briefcase, CheckCircle2, Clock, ListFilter, MapPin } from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { cn } from "@/lib/utils";
import { JobFilterSortPanel, DEFAULT_FILTER_STATE } from "@/components/jobs/JobFilterSortPanel";
import type { SortOption, FilterState } from "@/components/jobs/JobFilterSortPanel";

interface JobsListProps {
    localActiveJobs: JobsListItem[];
    extendedActiveJobs: JobsListItem[];
    waitlistedJobs: JobsListItem[];
    appliedJobs: JobsListItem[];
    isDemo: boolean;
    canApply: boolean;
    guardianStatus: string;
}

function sortJobs(jobs: JobsListItem[], sort: SortOption): JobsListItem[] {
    const arr = [...jobs];
    switch (sort) {
        case "distance":
            return arr.sort((a, b) => {
                if (a.distance_km == null && b.distance_km == null) return 0;
                if (a.distance_km == null) return 1;
                if (b.distance_km == null) return -1;
                return a.distance_km - b.distance_km;
            });
        case "newest":
            return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        case "wage_desc":
            return arr.sort((a, b) => {
                if (a.wage_hourly == null && b.wage_hourly == null) return 0;
                if (a.wage_hourly == null) return 1;
                if (b.wage_hourly == null) return -1;
                return b.wage_hourly - a.wage_hourly;
            });
        default:
            return arr;
    }
}

function applyFilters(jobs: JobsListItem[], filters: FilterState): JobsListItem[] {
    return jobs.filter((job) => {
        if (filters.categories.length > 0 && !filters.categories.includes(job.category ?? "other")) {
            return false;
        }
        if (filters.maxDistanceKm !== null) {
            if (job.distance_km == null || job.distance_km > filters.maxDistanceKm) {
                return false;
            }
        }
        return true;
    });
}

export function JobsList({ localActiveJobs, extendedActiveJobs, waitlistedJobs, appliedJobs, isDemo, canApply, guardianStatus }: JobsListProps) {
    const [selectedJob, setSelectedJob] = useState<JobsListItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'waitlist' | 'applied'>('active');
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Default sort: distance (ascending), user can change
    const [sortOption, setSortOption] = useState<SortOption>("distance");
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

    const activeFilterCount = (filterState.categories.length > 0 ? 1 : 0) + (filterState.maxDistanceKm !== null ? 1 : 0);
    const hasActiveFilters = activeFilterCount > 0;

    const handleJobSelect = useCallback((job: JobsListItem) => {
        setSelectedJob(job);
        setIsDetailOpen(true);
    }, []);

    const handleReset = useCallback(() => {
        setSortOption("distance");
        setFilterState(DEFAULT_FILTER_STATE);
    }, []);

    const filteredLocalJobs = useMemo(() =>
        sortJobs(applyFilters(localActiveJobs, filterState), sortOption),
        [localActiveJobs, filterState, sortOption]
    );

    const filteredExtendedJobs = useMemo(() =>
        sortJobs(applyFilters(extendedActiveJobs, filterState), sortOption),
        [extendedActiveJobs, filterState, sortOption]
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
                        onClick={() => setShowFilterPanel(true)}
                        className={cn(
                            "relative h-full aspect-square flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0 ml-0.5",
                            (showFilterPanel || hasActiveFilters) && "text-indigo-400 bg-white/5"
                        )}
                        style={{ height: '36px', width: '36px' }}
                    >
                        <ListFilter size={18} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
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
                        {(filteredLocalJobs.length + filteredExtendedJobs.length) > 0 && (
                            <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {filteredLocalJobs.length + filteredExtendedJobs.length}
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
                    onClick={() => setShowFilterPanel(true)}
                    className={cn(
                        "relative ml-4 py-2 px-3 sm:px-4 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 whitespace-nowrap border border-transparent hover:border-white/10",
                        showFilterPanel && "bg-white/10 text-indigo-400 border-indigo-500/20",
                        hasActiveFilters && "text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
                    )}
                    title="Filter & Sortierung"
                >
                    <ListFilter size={18} />
                    <span className="hidden sm:inline text-xs sm:text-sm font-medium">Filter</span>
                    {activeFilterCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
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
                            jobs={filteredLocalJobs}
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
                                            {hasActiveFilters
                                                ? "Keine lokalen Jobs für deine aktuellen Filter. Versuche, die Filter anzupassen."
                                                : extendedActiveJobs.length > 0
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
                    {(filteredExtendedJobs.length > 0 || (hasActiveFilters && extendedActiveJobs.length > 0)) && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both mt-12">
                            <JobsListSection
                                title="Überregionale Angebote"
                                icon={MapPin}
                                colorClass="text-violet-400"
                                jobs={filteredExtendedJobs}
                                emptyMsg="Keine überregionalen Jobs für deine aktuellen Filter."
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

            {/* Filter & Sort Panel */}
            {showFilterPanel && (
                <JobFilterSortPanel
                    sortOption={sortOption}
                    filterState={filterState}
                    onSortChange={setSortOption}
                    onFilterChange={setFilterState}
                    onClose={() => setShowFilterPanel(false)}
                    onReset={handleReset}
                    hasActiveFilters={hasActiveFilters}
                />
            )}
        </>
    );
}
