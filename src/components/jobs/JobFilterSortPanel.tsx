"use client";

import { useCallback, useEffect, useRef } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, SlidersHorizontal, ArrowUpDown, Tag, MapPin, Navigation, Zap, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";

// ─── Types & Constants ────────────────────────────────────────────────────────

export type SortOption = "distance" | "newest" | "wage_desc";

export const DEFAULT_SORT_OPTION: SortOption = "distance";

export interface FilterState {
    categories: string[];
    maxDistanceKm: number | null;
}

export const DEFAULT_FILTER_STATE: FilterState = {
    categories: [],
    maxDistanceKm: null,
};

export const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ElementType; description: string }[] = [
    {
        value: "distance",
        label: "Entfernung",
        icon: Navigation,
        description: "Nächstgelegene zuerst",
    },
    {
        value: "newest",
        label: "Neueste",
        icon: Zap,
        description: "Zuletzt eingestellt",
    },
    {
        value: "wage_desc",
        label: "Vergütung",
        icon: Euro,
        description: "Höchste zuerst",
    },
];

const DISTANCE_OPTIONS = [5, 10, 20, 50];

// ─── Stagger animation variants ──────────────────────────────────────────────

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.04, delayChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface JobFilterSortPanelProps {
    isOpen: boolean;
    sortOption: SortOption;
    filterState: FilterState;
    onSortChange: (sort: SortOption) => void;
    onFilterChange: React.Dispatch<React.SetStateAction<FilterState>>;
    onClose: () => void;
    onReset: () => void;
    hasChanges: boolean;
    /** Total result count to show in the CTA */
    resultCount?: number;
}

export function JobFilterSortPanel({
    isOpen,
    sortOption,
    filterState,
    onSortChange,
    onFilterChange,
    onClose,
    onReset,
    hasChanges,
    resultCount,
}: JobFilterSortPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Lock body scroll + Escape key
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
        document.addEventListener("keydown", handleKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener("keydown", handleKey);
        };
    }, [isOpen, onClose]);

    const toggleCategory = useCallback((id: string) => {
        onFilterChange((prev) => ({
            ...prev,
            categories: prev.categories.includes(id)
                ? prev.categories.filter((c) => c !== id)
                : [...prev.categories, id],
        }));
    }, [onFilterChange]);

    const setMaxDistance = useCallback((km: number | null) => {
        onFilterChange((prev) => ({ ...prev, maxDistanceKm: km }));
    }, [onFilterChange]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filter & Sortierung"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: 48, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 48, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="relative w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-[0_32px_80px_-8px_rgba(0,0,0,0.7)] border-t sm:border border-white/[0.08] bg-gradient-to-b from-[#1c1c22] to-[#18181b]"
                    >
                        {/* Top gradient accent */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent" />

                        {/* Drag handle (mobile) */}
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/15 rounded-full sm:hidden" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-7 pb-4 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <SlidersHorizontal size={15} />
                                </div>
                                <span className="text-white font-bold text-[15px] tracking-tight">Filter &amp; Sortierung</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AnimatePresence>
                                    {hasChanges && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            onClick={onReset}
                                            className="text-[11px] text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                                        >
                                            Zurücksetzen
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                                <button
                                    onClick={onClose}
                                    aria-label="Schließen"
                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mx-6" />

                        {/* Scrollable body */}
                        <motion.div
                            className="overflow-y-auto flex-1 px-6 py-5 space-y-7"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* ── Sort ─────────────────────────────────────── */}
                            <motion.section variants={itemVariants}>
                                <SectionLabel icon={ArrowUpDown} label="Sortierung" />
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    {SORT_OPTIONS.map((opt) => {
                                        const isSelected = sortOption === opt.value;
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onSortChange(opt.value)}
                                                className={cn(
                                                    "relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border text-center transition-all duration-200",
                                                    isSelected
                                                        ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_20px_-4px_rgba(99,102,241,0.4)]"
                                                        : "bg-white/[0.04] border-white/[0.07] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 hover:border-white/15"
                                                )}
                                            >
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="sort-selected-bg"
                                                        className="absolute inset-0 rounded-2xl bg-indigo-500/10"
                                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                    />
                                                )}
                                                <Icon size={16} className={cn("relative z-10", isSelected ? "text-indigo-400" : "text-slate-500")} />
                                                <span className="relative z-10 text-[11px] font-bold leading-tight">{opt.label}</span>
                                                <span className={cn("relative z-10 text-[9px] leading-tight", isSelected ? "text-indigo-400/80" : "text-slate-600")}>{opt.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* ── Category ─────────────────────────────────── */}
                            <motion.section variants={itemVariants}>
                                <SectionLabel icon={Tag} label="Kategorie" />
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {JOB_CATEGORIES.map((cat) => {
                                        const isActive = filterState.categories.includes(cat.id);
                                        const CatIcon = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all duration-200",
                                                    isActive
                                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_-3px_rgba(99,102,241,0.4)]"
                                                        : "bg-white/[0.04] text-slate-400 border-white/[0.07] hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/15"
                                                )}
                                            >
                                                <CatIcon size={11} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* ── Distance ─────────────────────────────────── */}
                            <motion.section variants={itemVariants}>
                                <SectionLabel icon={MapPin} label="Maximale Entfernung" />
                                <div className="flex items-center gap-2 flex-wrap mt-3">
                                    {[null, ...DISTANCE_OPTIONS].map((km) => {
                                        const isActive = filterState.maxDistanceKm === km;
                                        return (
                                            <button
                                                key={km ?? "all"}
                                                onClick={() => setMaxDistance(km)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all duration-200",
                                                    isActive
                                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_-3px_rgba(99,102,241,0.4)]"
                                                        : "bg-white/[0.04] text-slate-400 border-white/[0.07] hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/15"
                                                )}
                                            >
                                                {km === null ? "Alle" : `${km} km`}
                                            </button>
                                        );
                                    })}
                                </div>
                                {filterState.maxDistanceKm !== null && (
                                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                                        Jobs ohne Entfernungsangabe werden ausgeblendet.
                                    </p>
                                )}
                            </motion.section>
                        </motion.div>

                        {/* Footer */}
                        <div className="px-6 py-5 shrink-0">
                            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                            <button
                                onClick={onClose}
                                className="relative w-full py-3.5 rounded-2xl font-bold text-sm overflow-hidden group transition-all"
                            >
                                {/* Gradient background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 group-hover:from-indigo-500 group-hover:to-violet-500 transition-all duration-300" />
                                {/* Subtle shine */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                                <span className="relative text-white">
                                    {resultCount !== undefined
                                        ? `${resultCount} ${resultCount === 1 ? "Job" : "Jobs"} anzeigen`
                                        : "Ergebnisse anzeigen"}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <Icon size={11} />
            {label}
        </h4>
    );
}

