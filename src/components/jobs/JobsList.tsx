"use client";

import React, { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { JobsListSection } from "@/components/jobs/JobsListSection";
import { JobDetailModal } from "@/components/jobs/JobDetailModal";
import { Briefcase, CheckCircle2, Clock, ListFilter, MapPin } from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { cn } from "@/lib/utils";
import {
    JobFilterSortPanel,
    DEFAULT_FILTER_STATE,
    DEFAULT_SORT_OPTION,
    SORT_OPTIONS,
} from "@/components/jobs/JobFilterSortPanel";
import type { SortOption, FilterState } from "@/components/jobs/JobFilterSortPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobsListProps {
    localActiveJobs: JobsListItem[];
    extendedActiveJobs: JobsListItem[];
    waitlistedJobs: JobsListItem[];
    appliedJobs: JobsListItem[];
    isDemo: boolean;
    canApply: boolean;
    guardianStatus: string;
}

type Tab = "active" | "waitlist" | "applied";

// ─── Pure sort/filter helpers ─────────────────────────────────────────────────

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
            return arr.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
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
            if (job.distance_km == null || job.distance_km > filters.maxDistanceKm) return false;
        }
        return true;
    });
}

// ─── Animation variants ───────────────────────────────────────────────────────

const tabContentVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

const TAB_ORDER: Tab[] = ["active", "waitlist", "applied"];

// ─── Component ────────────────────────────────────────────────────────────────

export function JobsList({
    localActiveJobs,
    extendedActiveJobs,
    waitlistedJobs,
    appliedJobs,
    isDemo,
    canApply,
    guardianStatus,
}: JobsListProps) {
    const [selectedJob, setSelectedJob] = useState<JobsListItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("active");
    const [prevTab, setPrevTab] = useState<Tab>("active");
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Sort & filter state
    const [sortOption, setSortOption] = useState<SortOption>(DEFAULT_SORT_OPTION);
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

    // Derived booleans for UI
    const activeFilterCount =
        (filterState.categories.length > 0 ? 1 : 0) +
        (filterState.maxDistanceKm !== null ? 1 : 0);
    const isNonDefaultSort = sortOption !== DEFAULT_SORT_OPTION;
    const hasChanges = activeFilterCount > 0 || isNonDefaultSort;
    const totalBadgeCount = activeFilterCount + (isNonDefaultSort ? 1 : 0);
    const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "";

    // Compute slide direction based on tab order
    const slideDir = TAB_ORDER.indexOf(activeTab) > TAB_ORDER.indexOf(prevTab) ? 1 : -1;

    const handleTabChange = useCallback((tab: Tab) => {
        setPrevTab(activeTab);
        setActiveTab(tab);
    }, [activeTab]);

    const handleJobSelect = useCallback((job: JobsListItem) => {
        setSelectedJob(job);
        setIsDetailOpen(true);
    }, []);

    const handleReset = useCallback(() => {
        setSortOption(DEFAULT_SORT_OPTION);
        setFilterState(DEFAULT_FILTER_STATE);
    }, []);

    // Filtered + sorted lists
    // Active sections: sort AND filter apply
    const filteredLocalJobs = useMemo(
        () => sortJobs(applyFilters(localActiveJobs, filterState), sortOption),
        [localActiveJobs, filterState, sortOption]
    );
    const filteredExtendedJobs = useMemo(
        () => sortJobs(applyFilters(extendedActiveJobs, filterState), sortOption),
        [extendedActiveJobs, filterState, sortOption]
    );

    // Waitlist + applied: only sort applies (these are user-specific, no category filter needed)
    const sortedWaitlistedJobs = useMemo(
        () => sortJobs(waitlistedJobs, sortOption),
        [waitlistedJobs, sortOption]
    );
    const sortedAppliedJobs = useMemo(
        () => sortJobs(appliedJobs, sortOption),
        [appliedJobs, sortOption]
    );

    const totalVisibleActiveJobs = filteredLocalJobs.length + filteredExtendedJobs.length;

    return (
        <>
            {/* ── Mobile Tab Bar ───────────────────────────────────────── */}
            <div className="flex justify-center mb-6 md:hidden w-full">
                <div className="flex items-center justify-between w-full bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 border border-white/[0.08] rounded-2xl p-1 shadow-sm">
                    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
                        <MobileTab
                            active={activeTab === "active"}
                            onClick={() => handleTabChange("active")}
                            activeClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        >
                            <Briefcase size={14} />
                            Aktuell
                            {totalVisibleActiveJobs > 0 && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
                                    {totalVisibleActiveJobs}
                                </span>
                            )}
                        </MobileTab>
                        <MobileTab
                            active={activeTab === "waitlist"}
                            onClick={() => handleTabChange("waitlist")}
                            activeClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
                        >
                            <Clock size={14} />
                            Warteliste
                            {sortedWaitlistedJobs.length > 0 && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                                    {sortedWaitlistedJobs.length}
                                </span>
                            )}
                        </MobileTab>
                        <MobileTab
                            active={activeTab === "applied"}
                            onClick={() => handleTabChange("applied")}
                            activeClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        >
                            <CheckCircle2 size={14} />
                            Beworben
                            {sortedAppliedJobs.length > 0 && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                                    {sortedAppliedJobs.length}
                                </span>
                            )}
                        </MobileTab>
                    </div>

                    <div className="w-px h-7 bg-white/10 mx-1 shrink-0" />

                    {/* Filter button */}
                    <FilterButton
                        onClick={() => setShowFilterPanel(true)}
                        badgeCount={totalBadgeCount}
                        isActive={hasChanges}
                        className="h-9 w-9 rounded-xl"
                    />
                </div>
            </div>

            {/* ── Desktop Tab Bar ──────────────────────────────────────── */}
            <div className="hidden md:flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                <div className="flex items-center gap-1">
                    <DesktopTab
                        active={activeTab === "active"}
                        onClick={() => handleTabChange("active")}
                    >
                        <Briefcase size={15} className={cn(activeTab === "active" ? "text-indigo-400" : "text-slate-500")} />
                        Aktuell
                        {totalVisibleActiveJobs > 0 && (
                            <TabBadge>{totalVisibleActiveJobs}</TabBadge>
                        )}
                    </DesktopTab>
                    <DesktopTab
                        active={activeTab === "waitlist"}
                        onClick={() => handleTabChange("waitlist")}
                    >
                        <Clock size={15} className={cn(activeTab === "waitlist" ? "text-amber-400" : "text-slate-500")} />
                        Warteliste
                        {sortedWaitlistedJobs.length > 0 && (
                            <TabBadge>{sortedWaitlistedJobs.length}</TabBadge>
                        )}
                    </DesktopTab>
                    <DesktopTab
                        active={activeTab === "applied"}
                        onClick={() => handleTabChange("applied")}
                    >
                        <CheckCircle2 size={15} className={cn(activeTab === "applied" ? "text-emerald-400" : "text-slate-500")} />
                        Beworben
                        {sortedAppliedJobs.length > 0 && (
                            <TabBadge>{sortedAppliedJobs.length}</TabBadge>
                        )}
                    </DesktopTab>
                </div>

                {/* Desktop filter button */}
                <button
                    onClick={() => setShowFilterPanel(true)}
                    className={cn(
                        "relative ml-4 py-2 px-3 sm:px-4 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 whitespace-nowrap border border-transparent hover:border-white/10",
                        showFilterPanel && "bg-white/10 text-indigo-400 border-indigo-500/20",
                        hasChanges && !showFilterPanel && "text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
                    )}
                    title="Filter & Sortierung"
                >
                    <ListFilter size={17} />
                    <span className="hidden sm:inline text-xs font-semibold">
                        {isNonDefaultSort && !activeFilterCount ? currentSortLabel : "Filter"}
                    </span>
                    {totalBadgeCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {totalBadgeCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Tab Content ──────────────────────────────────────────── */}
            <div className="relative pb-20" style={{ minHeight: 200 }}>
                <AnimatePresence mode="wait" custom={slideDir}>
                    {activeTab === "active" && (
                        <motion.div
                            key="active"
                            custom={slideDir}
                            variants={tabContentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="space-y-16"
                        >
                            {/* Local Jobs */}
                            <JobsListSection
                                title="Lokale Angebote"
                                icon={Briefcase}
                                colorClass="text-indigo-400"
                                jobs={filteredLocalJobs}
                                emptyMsg={
                                    <EmptyState
                                        icon={Briefcase}
                                        title="Aktuell keine lokalen Jobs"
                                        message={
                                            hasChanges
                                                ? "Keine lokalen Jobs für deine aktuellen Filter. Versuche, die Filter anzupassen."
                                                : extendedActiveJobs.length > 0
                                                    ? "Entdecke unten spannende überregionale Angebote aus benachbarten Städten."
                                                    : "In deiner Stadt wird gerade keine Unterstützung gesucht."
                                        }
                                    />
                                }
                                isWhiteTitle={true}
                                isDemo={isDemo}
                                canApply={canApply}
                                hideStatusLabel={true}
                                onSelect={handleJobSelect}
                            />

                            {/* Extended Jobs */}
                            {(filteredExtendedJobs.length > 0 || (hasChanges && extendedActiveJobs.length > 0)) && (
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
                            )}
                        </motion.div>
                    )}

                    {activeTab === "waitlist" && (
                        <motion.div
                            key="waitlist"
                            custom={slideDir}
                            variants={tabContentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        >
                            <JobsListSection
                                title="Warteliste"
                                icon={Clock}
                                colorClass="text-amber-400"
                                jobs={sortedWaitlistedJobs}
                                emptyMsg="Aktuell sind keine Jobs für die Warteliste verfügbar."
                                isDemo={isDemo}
                                canApply={canApply}
                                hideStatusLabel={true}
                                onSelect={handleJobSelect}
                            />
                        </motion.div>
                    )}

                    {activeTab === "applied" && (
                        <motion.div
                            key="applied"
                            custom={slideDir}
                            variants={tabContentVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        >
                            <JobsListSection
                                title="Bereits Beworben"
                                icon={CheckCircle2}
                                colorClass="text-emerald-400"
                                jobs={sortedAppliedJobs}
                                emptyMsg="Noch keine Bewerbungen versendet."
                                isDemo={isDemo}
                                canApply={canApply}
                                hideStatusLabel={true}
                                onSelect={handleJobSelect}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <JobDetailModal
                job={selectedJob}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onClosed={() => setSelectedJob(null)}
                canApply={canApply}
                guardianStatus={guardianStatus}
            />

            <JobFilterSortPanel
                isOpen={showFilterPanel}
                sortOption={sortOption}
                filterState={filterState}
                onSortChange={setSortOption}
                onFilterChange={setFilterState}
                onClose={() => setShowFilterPanel(false)}
                onReset={handleReset}
                hasChanges={hasChanges}
                resultCount={
                    activeTab === "active"
                        ? totalVisibleActiveJobs
                        : activeTab === "waitlist"
                            ? sortedWaitlistedJobs.length
                            : sortedAppliedJobs.length
                }
            />
        </>
    );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function MobileTab({
    active,
    onClick,
    activeClass,
    children,
}: {
    active: boolean;
    onClick: () => void;
    activeClass: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border",
                active ? activeClass : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
            )}
        >
            {children}
        </button>
    );
}

function DesktopTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
                active
                    ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
        >
            {children}
        </button>
    );
}

function TabBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-0.5">
            {children}
        </span>
    );
}

function FilterButton({
    onClick,
    badgeCount,
    isActive,
    className,
}: {
    onClick: () => void;
    badgeCount: number;
    isActive: boolean;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0",
                isActive && "text-indigo-400 bg-white/5",
                className
            )}
        >
            <ListFilter size={17} />
            {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {badgeCount}
                </span>
            )}
        </button>
    );
}

function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-8 px-4">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-110 pointer-events-none" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-white/[0.05] flex items-center justify-center shadow-xl relative z-10 text-indigo-400/80">
                    <Icon size={32} className="opacity-80" />
                </div>
            </div>
            <div className="text-center space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">{message}</p>
            </div>
        </div>
    );
}

