"use client";

import { useCallback, useEffect, useRef } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, SlidersHorizontal, ArrowUpDown, Tag, MapPin, Navigation, Zap, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";
import {
    type SortOption,
    type FilterState,
    SORT_META,
} from "@/lib/jobs/sortFilter";

// ─── Sort option metadata (with UI icons) ─────────────────────────────────────

const SORT_OPTIONS: readonly {
    value: SortOption;
    label: string;
    description: string;
    icon: React.ElementType;
}[] = [
    { value: "distance",  icon: Navigation, ...SORT_META.distance },
    { value: "newest",    icon: Zap,        ...SORT_META.newest },
    { value: "wage_desc", icon: Euro,       ...SORT_META.wage_desc },
];

const DISTANCE_OPTIONS = [5, 10, 20, 50] as const;
/** null = "Alle" (no filter), followed by specific km values */
const ALL_DISTANCE_OPTIONS: (number | null)[] = [null, ...DISTANCE_OPTIONS];

// ─── Stable animation variant objects (defined once; not re-created per render) ─

/** Full motion: stagger sections + translateY */
const ITEM_VARIANTS = {
    hidden: { opacity: 0, y: 6 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 400, damping: 28 },
    },
};

/** Reduced motion: fade only, no translate */
const ITEM_VARIANTS_REDUCED = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15 } },
};

const CONTAINER_VARIANTS = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

/** Spring spec for chip/card press feedback — snappy in, soft release */
const CHIP_SPRING = { type: "spring" as const, stiffness: 600, damping: 28 } as const;

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
    /** Pass the current visible result count; enables context-aware CTA copy. */
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
    const prefersReduced = useReducedMotion() ?? false;

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

    const isZeroResults = resultCount !== undefined && resultCount === 0;

    const ctaLabel = isZeroResults
        ? "Keine Treffer – Filter anpassen"
        : resultCount !== undefined
            ? `${resultCount} ${resultCount === 1 ? "Job" : "Jobs"} anzeigen`
            : "Ergebnisse anzeigen";

    // Tap scale for interactive elements — disabled when user prefers reduced motion
    const tapScale = (scale: number) => prefersReduced ? {} : { scale };

    // Panel enter/exit — reduced motion skips translate + scale
    const panelMotion = prefersReduced
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit:    { opacity: 0 },
            transition: { duration: 0.18 },
        }
        : {
            initial:  { opacity: 0, y: 48, scale: 0.97 },
            animate:  { opacity: 1, y: 0,  scale: 1    },
            exit:     { opacity: 0, y: 48, scale: 0.97 },
            transition: { type: "spring" as const, stiffness: 420, damping: 32 },
        };

    // Variant set based on accessibility preference
    const sectionVariants = prefersReduced ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="filter-panel-title"
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

                    {/* Panel — flat dark surface, no gradient fill */}
                    <motion.div
                        ref={panelRef}
                        {...panelMotion}
                        className="relative w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-[0_24px_64px_-8px_rgba(0,0,0,0.6)] border-t sm:border border-white/[0.08] bg-[#1a1a20]"
                    >
                        {/* Hairline top accent */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                        {/* Drag handle (mobile only) */}
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/15 rounded-full sm:hidden" aria-hidden="true" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-7 pb-4 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300" aria-hidden="true">
                                    <SlidersHorizontal size={15} />
                                </div>
                                <span
                                    id="filter-panel-title"
                                    className="text-white font-semibold text-[15px] tracking-tight"
                                >
                                    Filter &amp; Sortierung
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <AnimatePresence>
                                    {hasChanges && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: prefersReduced ? 1 : 0.85 }}
                                            transition={{ duration: 0.15 }}
                                            whileTap={tapScale(0.95)}
                                            onClick={onReset}
                                            className="text-[11px] text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                                        >
                                            Zurücksetzen
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                                <motion.button
                                    onClick={onClose}
                                    aria-label="Schließen"
                                    whileTap={tapScale(0.88)}
                                    transition={CHIP_SPRING}
                                    className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.05] mx-6" />

                        {/* Scrollable body */}
                        <motion.div
                            className="overflow-y-auto flex-1 px-6 py-5 space-y-7"
                            variants={CONTAINER_VARIANTS}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* ── Sort ─────────────────────────────────────── */}
                            <motion.section variants={sectionVariants}>
                                <SectionLabel icon={ArrowUpDown} label="Sortierung" />
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    {SORT_OPTIONS.map((opt) => {
                                        const isSelected = sortOption === opt.value;
                                        const Icon = opt.icon;
                                        return (
                                            <motion.button
                                                key={opt.value}
                                                onClick={() => onSortChange(opt.value)}
                                                aria-pressed={isSelected}
                                                whileTap={tapScale(0.96)}
                                                transition={CHIP_SPRING}
                                                className={cn(
                                                    "relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border text-center transition-colors duration-150",
                                                    isSelected
                                                        ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-300"
                                                        : "bg-white/[0.04] border-white/[0.07] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 hover:border-white/15"
                                                )}
                                            >
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="sort-selected-bg"
                                                        className="absolute inset-0 rounded-2xl bg-indigo-500/[0.08]"
                                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                    />
                                                )}
                                                <Icon
                                                    size={16}
                                                    className={cn(
                                                        "relative z-10",
                                                        isSelected ? "text-indigo-400" : "text-slate-500"
                                                    )}
                                                />
                                                <span className="relative z-10 text-[12px] font-semibold leading-tight">
                                                    {opt.label}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "relative z-10 text-[11px] leading-tight",
                                                        isSelected ? "text-indigo-400/70" : "text-slate-600"
                                                    )}
                                                >
                                                    {opt.description}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* ── Category ─────────────────────────────────── */}
                            <motion.section variants={sectionVariants}>
                                <SectionLabel icon={Tag} label="Kategorie" />
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {JOB_CATEGORIES.map((cat) => {
                                        const isActive = filterState.categories.includes(cat.id);
                                        const CatIcon = cat.icon;
                                        return (
                                            <motion.button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                aria-pressed={isActive}
                                                whileTap={tapScale(0.96)}
                                                transition={CHIP_SPRING}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors duration-150 h-11",
                                                    isActive
                                                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/35"
                                                        : "bg-white/[0.04] text-slate-400 border-white/[0.07] hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/15"
                                                )}
                                            >
                                                <CatIcon
                                                    size={12}
                                                    className={isActive ? "text-indigo-400" : "text-slate-500"}
                                                />
                                                {cat.label}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* ── Distance ─────────────────────────────────── */}
                            <motion.section variants={sectionVariants}>
                                <SectionLabel icon={MapPin} label="Maximale Entfernung" />
                                <div className="flex items-center gap-2 flex-wrap mt-3">
                                    {ALL_DISTANCE_OPTIONS.map((km) => {
                                        const isActive = filterState.maxDistanceKm === km;
                                        return (
                                            <motion.button
                                                key={km ?? "all"}
                                                onClick={() => setMaxDistance(km)}
                                                aria-pressed={isActive}
                                                whileTap={tapScale(0.95)}
                                                transition={CHIP_SPRING}
                                                className={cn(
                                                    "px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors duration-150 h-11",
                                                    isActive
                                                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/35"
                                                        : "bg-white/[0.04] text-slate-400 border-white/[0.07] hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/15"
                                                )}
                                            >
                                                {km === null ? "Alle" : `${km} km`}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                <AnimatePresence>
                                    {filterState.maxDistanceKm !== null && (
                                        <motion.p
                                            key="distance-hint"
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="text-[11px] text-slate-500 leading-relaxed overflow-hidden"
                                        >
                                            Jobs ohne Entfernungsangabe werden ausgeblendet.
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.section>
                        </motion.div>

                        {/* Footer — includes safe-area inset for mobile home indicator */}
                        <div
                            className="px-6 pt-4 shrink-0"
                            style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
                        >
                            <div className="h-px bg-white/[0.05] mb-4" />
                            <motion.button
                                onClick={isZeroResults ? undefined : onClose}
                                disabled={isZeroResults}
                                aria-disabled={isZeroResults}
                                whileTap={isZeroResults ? {} : tapScale(0.98)}
                                transition={{ type: "spring" as const, stiffness: 400, damping: 28 }}
                                className={cn(
                                    "w-full py-3.5 rounded-2xl font-semibold text-sm overflow-hidden",
                                    isZeroResults
                                        ? "bg-white/[0.05] text-slate-500 border border-white/[0.07] cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-colors duration-150"
                                )}
                            >
                                {/* Animated label swap on count change */}
                                <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                        key={ctaLabel}
                                        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                                        transition={{ duration: 0.14, ease: "easeInOut" }}
                                        className="inline-block"
                                    >
                                        {ctaLabel}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
            <Icon size={11} aria-hidden="true" />
            {label}
        </h4>
    );
}


