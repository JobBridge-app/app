"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { JobsListSection } from "@/components/jobs/JobsListSection";
import { Briefcase, CheckCircle2, Clock, ListFilter } from "lucide-react";
import type { JobsListItem } from "@/lib/types/jobbridge";
import { cn } from "@/lib/utils";
import {
    deriveVisibleJobs,
    sortJobs,
    isValidSortOption,
    DEFAULT_SORT_OPTION,
    DEFAULT_FILTER_STATE,
    SORT_META,
    type SortOption,
    type FilterState,
} from "@/lib/jobs/sortFilter";
import { warmJobsUI } from "@/lib/ui-warmup";
import { endPerfMark, startPerfMark } from "@/lib/perf";

const JobDetailModal = dynamic(
    () => import("@/components/jobs/JobDetailModal").then((mod) => mod.JobDetailModal),
    { ssr: false }
);

const JobFilterSortPanel = dynamic(
    () => import("@/components/jobs/JobFilterSortPanel").then((mod) => mod.JobFilterSortPanel),
    { ssr: false }
);

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

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "jb_filter_sort_v1";

function loadPersistedState(): { sortOption: SortOption; filterState: FilterState } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { sortOption: DEFAULT_SORT_OPTION, filterState: DEFAULT_FILTER_STATE };
        const parsed = JSON.parse(raw) as { sortOption?: unknown; filterState?: Partial<FilterState> };
        const fs = parsed.filterState;
        return {
            sortOption: isValidSortOption(parsed.sortOption)
                ? parsed.sortOption
                : DEFAULT_SORT_OPTION,
            filterState: {
                categories: Array.isArray(fs?.categories)
                    ? fs.categories.filter((c): c is string => typeof c === "string")
                    : [],
                maxDistanceKm:
                    fs?.maxDistanceKm === null || typeof fs?.maxDistanceKm === "number"
                        ? (fs.maxDistanceKm ?? null)
                        : null,
            },
        };
    } catch {
        return { sortOption: DEFAULT_SORT_OPTION, filterState: DEFAULT_FILTER_STATE };
    }
}

function persistState(sortOption: SortOption, filterState: FilterState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sortOption, filterState }));
    } catch { /* storage unavailable — ignore */ }
}

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
    const [visitedTabs, setVisitedTabs] = useState<Record<Tab, boolean>>({
        active: true,
        waitlist: false,
        applied: false,
    });
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [hasOpenedFilterPanel, setHasOpenedFilterPanel] = useState(false);

    const [sortOption, setSortOption] = useState<SortOption>(DEFAULT_SORT_OPTION);
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

    // Load persisted state after hydration
    useEffect(() => {
        const { sortOption: s, filterState: f } = loadPersistedState();
        setSortOption(s);
        setFilterState(f);
    }, []);

    // Persist whenever state changes, debounced to avoid hammering storage on rapid chip toggles.
    // Timer lives in a ref so it is cancelled on unmount (no stale writes).
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        persistTimerRef.current && clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(
            () => persistState(sortOption, filterState),
            400
        );
        return () => { persistTimerRef.current && clearTimeout(persistTimerRef.current); };
    }, [sortOption, filterState]);

    // Derived UI state
    const activeFilterCount =
        (filterState.categories.length > 0 ? 1 : 0) +
        (filterState.maxDistanceKm !== null ? 1 : 0);
    const isNonDefaultSort = sortOption !== DEFAULT_SORT_OPTION;
    const hasChanges = activeFilterCount > 0 || isNonDefaultSort;
    const totalBadgeCount = activeFilterCount + (isNonDefaultSort ? 1 : 0);
    const currentSortLabel = SORT_META[sortOption].label;

    const handleTabChange = useCallback((tab: Tab) => {
        if (tab === activeTab) return;
        startPerfMark("jobs-tab-switch");
        setActiveTab(tab);
        setVisitedTabs((current) => ({ ...current, [tab]: true }));
    }, [activeTab]);

    const handleJobSelect = useCallback((job: JobsListItem) => {
        startPerfMark("job-detail-open");
        void warmJobsUI();
        setSelectedJob(job);
        setIsDetailOpen(true);
    }, []);

    const handleReset = useCallback(() => {
        setSortOption(DEFAULT_SORT_OPTION);
        setFilterState(DEFAULT_FILTER_STATE);
    }, []);

    // Filtered + sorted lists (memoized)
    const filteredLocalJobs = useMemo(
        () => deriveVisibleJobs(localActiveJobs, filterState, sortOption),
        [localActiveJobs, filterState, sortOption]
    );
    const filteredExtendedJobs = useMemo(
        () => deriveVisibleJobs(extendedActiveJobs, filterState, sortOption),
        [extendedActiveJobs, filterState, sortOption]
    );
    const sortedWaitlistedJobs = useMemo(
        () => sortJobs(waitlistedJobs, sortOption),
        [waitlistedJobs, sortOption]
    );
    const sortedAppliedJobs = useMemo(
        () => sortJobs(appliedJobs, sortOption),
        [appliedJobs, sortOption]
    );

    const totalVisibleActiveJobs = filteredLocalJobs.length + filteredExtendedJobs.length;

    const panelResultCount =
        activeTab === "active"
            ? totalVisibleActiveJobs
            : activeTab === "waitlist"
                ? sortedWaitlistedJobs.length
                : sortedAppliedJobs.length;

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            endPerfMark("jobs-tab-switch");
        });
        return () => cancelAnimationFrame(frameId);
    }, [activeTab]);

    useEffect(() => {
        if (showFilterPanel) setHasOpenedFilterPanel(true);
    }, [showFilterPanel]);

    const getPanelClassName = (tab: Tab) => {
        return cn(
            "col-start-1 row-start-1 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            activeTab === tab
                ? "relative z-10 translate-y-0 opacity-100 pointer-events-auto"
                : visitedTabs[tab]
                    ? "pointer-events-none opacity-0 translate-y-1"
                    : "hidden",
        );
    };

    return (
        <>
            {/* ── Mobile Tab Bar ───────────────────────────────────────── */}
            <div className="mb-7 flex w-full justify-center md:hidden">
                <div className="jobs-mobile-tabs flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95 p-1.5 shadow-[0_18px_50px_-26px_rgba(0,0,0,0.75)]">
                    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
                        <MobileTab
                            active={activeTab === "active"}
                            onClick={() => handleTabChange("active")}
                            activeClass="bg-white/[0.075] text-white border-white/10"
                        >
                            <Briefcase size={14} />
                            Aktuell
                            {totalVisibleActiveJobs > 0 && (
                                <span className="jobs-mobile-tab-badge">
                                    {totalVisibleActiveJobs}
                                </span>
                            )}
                        </MobileTab>
                        <MobileTab
                            active={activeTab === "waitlist"}
                            onClick={() => handleTabChange("waitlist")}
                            activeClass="bg-white/[0.075] text-white border-white/10"
                        >
                            <Clock size={14} />
                            Warteliste
                            {sortedWaitlistedJobs.length > 0 && (
                                <span className="jobs-mobile-tab-badge">
                                    {sortedWaitlistedJobs.length}
                                </span>
                            )}
                        </MobileTab>
                        <MobileTab
                            active={activeTab === "applied"}
                            onClick={() => handleTabChange("applied")}
                            activeClass="bg-white/[0.075] text-white border-white/10"
                        >
                            <CheckCircle2 size={14} />
                            Beworben
                            {sortedAppliedJobs.length > 0 && (
                                <span className="jobs-mobile-tab-badge">
                                    {sortedAppliedJobs.length}
                                </span>
                            )}
                        </MobileTab>
                    </div>

                    <div className="jobs-mobile-tabs-divider mx-1 h-7 w-px shrink-0 bg-white/10" />

                    <FilterButton
                        onClick={() => setShowFilterPanel(true)}
                        badgeCount={totalBadgeCount}
                        isActive={hasChanges}
                        className="h-9 w-9 rounded-xl"
                    />
                </div>
            </div>

            {/* ── Desktop Tab Bar ──────────────────────────────────────── */}
            <div className="jobs-desktop-tabs hidden items-center justify-between border-b border-white/[0.08] pb-5 md:mb-10 md:flex">
                <div className="jobs-tab-group flex items-center gap-2">
                    <DesktopTab
                        active={activeTab === "active"}
                        onClick={() => handleTabChange("active")}
                        activeClass="bg-indigo-500/10 text-white ring-indigo-400/20"
                    >
                        <Briefcase size={15} className={cn(activeTab === "active" ? "text-indigo-400" : "text-slate-500")} />
                        Aktuell
                        {totalVisibleActiveJobs > 0 && <TabBadge>{totalVisibleActiveJobs}</TabBadge>}
                    </DesktopTab>
                    <DesktopTab
                        active={activeTab === "waitlist"}
                        onClick={() => handleTabChange("waitlist")}
                        activeClass="bg-amber-500/10 text-white ring-amber-400/20"
                    >
                        <Clock size={15} className={cn(activeTab === "waitlist" ? "text-amber-400" : "text-slate-500")} />
                        Warteliste
                        {sortedWaitlistedJobs.length > 0 && <TabBadge>{sortedWaitlistedJobs.length}</TabBadge>}
                    </DesktopTab>
                    <DesktopTab
                        active={activeTab === "applied"}
                        onClick={() => handleTabChange("applied")}
                        activeClass="bg-emerald-500/10 text-white ring-emerald-400/20"
                    >
                        <CheckCircle2 size={15} className={cn(activeTab === "applied" ? "text-emerald-400" : "text-slate-500")} />
                        Beworben
                        {sortedAppliedJobs.length > 0 && <TabBadge>{sortedAppliedJobs.length}</TabBadge>}
                    </DesktopTab>
                </div>

                <button
                    onClick={() => setShowFilterPanel(true)}
                    data-active={showFilterPanel || hasChanges}
                    className={cn(
                        "jobs-filter-trigger relative ml-4 flex items-center gap-2.5 whitespace-nowrap rounded-full border border-transparent px-3.5 py-2.5 text-slate-400 transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.96] sm:px-4",
                        showFilterPanel && "bg-white/10 text-indigo-300 border-indigo-500/20",
                        hasChanges && !showFilterPanel && "text-indigo-300 border-indigo-500/20 bg-indigo-500/10"
                    )}
                    title="Filter & Sortierung"
                >
                    <ListFilter size={17} />
                    <span className="hidden sm:inline text-sm font-semibold">
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
                <div className="grid">
                    <div className={getPanelClassName("active")}>
                        <div className="space-y-16">
                            <JobsListSection
                                title="Lokale Angebote"
                                colorClass="text-indigo-400"
                                jobs={filteredLocalJobs}
                                emptyMsg={
                                    <EmptyState
                                        icon={Briefcase}
                                        title="Keine lokalen Jobs gefunden"
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

                            {(filteredExtendedJobs.length > 0 || (hasChanges && extendedActiveJobs.length > 0)) && (
                                <JobsListSection
                                    title="Überregionale Angebote"
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
                        </div>
                    </div>

                    <div className={getPanelClassName("waitlist")}>
                        <JobsListSection
                            title="Warteliste"
                            colorClass="text-amber-400"
                            jobs={sortedWaitlistedJobs}
                            emptyMsg="Aktuell sind keine Jobs für die Warteliste verfügbar."
                            isDemo={isDemo}
                            canApply={canApply}
                            hideStatusLabel={true}
                            onSelect={handleJobSelect}
                        />
                    </div>

                    <div className={getPanelClassName("applied")}>
                        <JobsListSection
                            title="Bereits Beworben"
                            colorClass="text-emerald-400"
                            jobs={sortedAppliedJobs}
                            emptyMsg="Noch keine Bewerbungen versendet."
                            isDemo={isDemo}
                            canApply={canApply}
                            hideStatusLabel={true}
                            onSelect={handleJobSelect}
                        />
                    </div>
                </div>
            </div>

            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    onClosed={() => setSelectedJob(null)}
                    canApply={canApply}
                    guardianStatus={guardianStatus}
                />
            )}

            {hasOpenedFilterPanel && (
                <JobFilterSortPanel
                    isOpen={showFilterPanel}
                    sortOption={sortOption}
                    filterState={filterState}
                    onSortChange={setSortOption}
                    onFilterChange={setFilterState}
                    onClose={() => setShowFilterPanel(false)}
                    onReset={handleReset}
                    hasChanges={hasChanges}
                    resultCount={panelResultCount}
                />
            )}
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
            data-active={active}
            className={cn(
                "jobs-mobile-tab relative flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-xs",
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
            data-active={active}
            className={cn(
                "jobs-desktop-tab relative flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-4",
                active
                    ? cn("ring-1", activeClass)
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
        >
            {children}
        </button>
    );
}

function TabBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="jobs-tab-badge ml-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-300">
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
            aria-label="Filter & Sortierung"
            className={cn(
                "jobs-filter-icon-button relative flex shrink-0 items-center justify-center text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
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

function EmptyState({
    icon: Icon,
    title,
    message,
}: {
    icon: React.ElementType;
    title: string;
    message: string;
}) {
    return (
        <div className="jobs-empty-copy flex flex-col items-center justify-center space-y-3 px-4 py-8">
            <div className="jobs-empty-icon flex h-12 w-12 items-center justify-center rounded-[0.95rem] border border-white/[0.05] bg-slate-900/40 text-indigo-300/50">
                <Icon size={20} className="opacity-[0.62]" />
            </div>
            <div className="space-y-1.5 text-center">
                <h3 className="jobs-empty-title text-lg font-bold leading-tight tracking-tight text-white">{title}</h3>
                <p className="jobs-empty-message mx-auto max-w-sm text-sm leading-relaxed text-slate-400">{message}</p>
            </div>
        </div>
    );
}
