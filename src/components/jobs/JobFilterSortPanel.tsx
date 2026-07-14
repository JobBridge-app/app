"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";
import {
    MAX_DISTANCE_KM_OPTIONS,
    type SortOption,
    type FilterState,
} from "@/lib/jobs/sortFilter";

// ─── Filter choices ────────────────────────────────────────────────────────────

const SORT_OPTIONS: readonly {
    value: SortOption;
    label: string;
}[] = [
    { value: "distance", label: "Am nächsten" },
    { value: "newest", label: "Neueste" },
    { value: "wage_desc", label: "Bester Lohn" },
];

const DISTANCE_OPTIONS: readonly {
    value: number | null;
    label: string;
    accessibleLabel: string;
}[] = [
    ...MAX_DISTANCE_KM_OPTIONS.map((value) => ({
        value,
        label: `${value} km`,
        accessibleLabel: `Bis zu ${value} Kilometer`,
    })),
    { value: null, label: "Alle", accessibleLabel: "Alle Entfernungen, keine Begrenzung" },
];

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

// ─── Stable animation variant objects (defined once; not re-created per render) ─

/** Full motion: stagger sections + translateY */
const ITEM_VARIANTS = {
    hidden: { opacity: 0, y: 4 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.16, ease: [0.2, 0, 0, 1] as const },
    },
};

/** Reduced motion: fade only, no translate */
const ITEM_VARIANTS_REDUCED = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15 } },
};

const CONTAINER_VARIANTS = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.02 } },
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
}: JobFilterSortPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    const [isDialogInteractionActive, setIsDialogInteractionActive] = useState(isOpen);
    const prefersReduced = useReducedMotion() ?? false;

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (isOpen) setIsDialogInteractionActive(true);
    }, [isOpen]);

    // Lock body scroll, keep keyboard focus inside the dialog, and restore it on close.
    useEffect(() => {
        if (!isDialogInteractionActive) return;
        const prev = document.body.style.overflow;
        previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        document.body.style.overflow = "hidden";
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab" || !panelRef.current) return;

            const focusable = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter((element) => element.getClientRects().length > 0);
            if (focusable.length === 0) {
                e.preventDefault();
                panelRef.current.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && (active === first || active === panelRef.current)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            } else if (!e.shiftKey && active === panelRef.current) {
                e.preventDefault();
                first.focus();
            }
        }
        document.addEventListener("keydown", handleKey);
        const focusFrame = window.requestAnimationFrame(() => panelRef.current?.focus());
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.body.style.overflow = prev;
            document.removeEventListener("keydown", handleKey);
            previousFocusRef.current?.focus();
        };
    }, [isDialogInteractionActive]);

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

    const handleReset = useCallback(() => {
        onReset();
        window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    }, [onReset]);

    if (typeof document === "undefined") return null;

    const matchedDistanceIndex = DISTANCE_OPTIONS.findIndex(
        (option) => option.value === filterState.maxDistanceKm
    );
    const selectedDistanceIndex = matchedDistanceIndex >= 0
        ? matchedDistanceIndex
        : DISTANCE_OPTIONS.length - 1;
    const distanceProgress = selectedDistanceIndex / (DISTANCE_OPTIONS.length - 1) * 100;
    const distanceSummary = filterState.maxDistanceKm === null
        ? "Ohne Begrenzung"
        : `Bis ${filterState.maxDistanceKm} km`;

    // One consistent tactile press response for every interactive element.
    const tapScale = prefersReduced ? {} : { scale: 0.96 };

    // Panel enter/exit — short travel keeps the compact dialog feeling immediate.
    const panelMotion = prefersReduced
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit:    { opacity: 0 },
            transition: { duration: 0.18 },
        }
        : {
            initial:  { opacity: 0, y: 12 },
            animate:  { opacity: 1, y: 0 },
            exit:     { opacity: 0, y: 10 },
            transition: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
        };

    // Variant set based on accessibility preference
    const sectionVariants = prefersReduced ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS;

    return createPortal(
        <AnimatePresence
            onExitComplete={() => {
                if (!isOpen) setIsDialogInteractionActive(false);
            }}
        >
            {isOpen && (
                <div
                    id="job-filter-panel"
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
                        className="job-filter-backdrop absolute inset-0"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Panel — existing compact layout, aligned with the app surfaces */}
                    <motion.div
                        ref={panelRef}
                        {...panelMotion}
                        tabIndex={-1}
                        className="job-filter-panel relative flex max-h-[94dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border-t outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border"
                    >
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-5">
                            <h2
                                id="filter-panel-title"
                                className="job-filter-title text-[16px] font-semibold tracking-tight"
                            >
                                Jobs filtern<span className="sr-only"> und sortieren</span>
                            </h2>
                            <motion.button
                                ref={closeButtonRef}
                                onClick={onClose}
                                aria-label="Schließen"
                                whileTap={tapScale}
                                transition={CHIP_SPRING}
                                type="button"
                                className="job-filter-close-button flex h-11 w-11 items-center justify-center rounded-xl"
                            >
                                <X size={18} />
                            </motion.button>
                        </div>

                        {/* Divider */}
                        <div className="job-filter-divider mx-6 h-px" />

                        {/* Scrollable body */}
                        <motion.div
                            className="job-filter-body flex-1 space-y-7 overflow-y-auto px-6 py-5"
                            variants={CONTAINER_VARIANTS}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* ── Sort ─────────────────────────────────────── */}
                            <motion.fieldset variants={sectionVariants}>
                                <legend className="job-filter-section-label text-sm font-medium">
                                    Sortieren nach
                                </legend>
                                <div className="job-filter-segmented mt-3 grid grid-cols-3 gap-1 rounded-2xl p-1">
                                    {SORT_OPTIONS.map((opt) => {
                                        const isSelected = sortOption === opt.value;
                                        return (
                                            <div key={opt.value} className="min-w-0">
                                                <input
                                                    id={`job-filter-sort-${opt.value}`}
                                                    className="job-filter-segment-input sr-only"
                                                    type="radio"
                                                    name="job-filter-sort"
                                                    value={opt.value}
                                                    checked={isSelected}
                                                    onChange={() => onSortChange(opt.value)}
                                                />
                                                <motion.label
                                                    htmlFor={`job-filter-sort-${opt.value}`}
                                                    whileTap={tapScale}
                                                    transition={CHIP_SPRING}
                                                    className="job-filter-segment flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-2 text-center text-[12px] font-medium leading-tight"
                                                >
                                                    {opt.label}
                                                </motion.label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.fieldset>

                            {/* ── Category ─────────────────────────────────── */}
                            <motion.section variants={sectionVariants}>
                                <h3 className="job-filter-section-label text-sm font-medium">
                                    Welche Art von Job?
                                </h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {JOB_CATEGORIES.map((cat) => {
                                        const isActive = filterState.categories.includes(cat.id);
                                        return (
                                            <motion.button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                aria-pressed={isActive}
                                                whileTap={tapScale}
                                                transition={CHIP_SPRING}
                                                type="button"
                                                className="job-filter-chip flex min-h-11 items-center rounded-xl px-3.5 py-2 text-[12px] font-medium"
                                            >
                                                {cat.label}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* ── Distance ─────────────────────────────────── */}
                            <motion.fieldset
                                variants={sectionVariants}
                                aria-describedby={filterState.maxDistanceKm !== null
                                    ? "job-filter-distance-hint"
                                    : undefined}
                            >
                                <legend className="sr-only">
                                    Maximale Entfernung
                                </legend>
                                <div className="flex items-baseline justify-between gap-4">
                                    <span
                                        className="job-filter-section-label text-sm font-medium"
                                        aria-hidden="true"
                                    >
                                        Maximale Entfernung
                                    </span>
                                    <span className="job-filter-distance-value shrink-0 text-[11px] font-semibold tabular-nums">
                                        {distanceSummary}
                                    </span>
                                </div>
                                <div
                                    className="job-filter-distance-scale relative mt-3"
                                    style={{ "--job-filter-distance-progress": `${distanceProgress}%` } as React.CSSProperties}
                                >
                                    <div className="job-filter-distance-rail" aria-hidden="true">
                                        <span className="job-filter-distance-fill" />
                                    </div>
                                    <div className="grid grid-cols-5">
                                        {DISTANCE_OPTIONS.map((option, index) => {
                                            const isActive = filterState.maxDistanceKm === option.value;
                                            return (
                                                <div
                                                    key={option.value ?? "all"}
                                                    className="job-filter-distance-choice min-w-0"
                                                    data-in-range={index <= selectedDistanceIndex}
                                                    data-selected={isActive}
                                                >
                                                    <input
                                                        id={`job-filter-distance-${option.value ?? "all"}`}
                                                        className="job-filter-distance-input sr-only"
                                                        type="radio"
                                                        name="job-filter-distance"
                                                        value={option.value ?? "all"}
                                                        checked={isActive}
                                                        aria-label={option.accessibleLabel}
                                                        onChange={() => setMaxDistance(option.value)}
                                                    />
                                                    <motion.label
                                                        htmlFor={`job-filter-distance-${option.value ?? "all"}`}
                                                        whileTap={tapScale}
                                                        transition={CHIP_SPRING}
                                                        className="job-filter-distance-option relative flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-xl px-0.5 pt-1 text-center text-[11px] font-medium leading-none"
                                                    >
                                                        <span className="job-filter-distance-dot" aria-hidden="true" />
                                                        <span className="tabular-nums">{option.label}</span>
                                                    </motion.label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {filterState.maxDistanceKm !== null && (
                                        <motion.p
                                            key="distance-hint"
                                            id="job-filter-distance-hint"
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="job-filter-distance-hint overflow-hidden text-[11px] leading-relaxed"
                                        >
                                            Jobs ohne Entfernungsangabe sind dann nicht dabei.
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.fieldset>
                        </motion.div>

                        {/* Footer — includes safe-area inset for mobile home indicator */}
                        <div
                            className="px-6 pt-4 shrink-0"
                            style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
                        >
                            <div className="job-filter-divider mb-4 h-px" />
                            <div className={hasChanges ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
                                {hasChanges && (
                                    <motion.button
                                        onClick={handleReset}
                                        whileTap={tapScale}
                                        transition={CHIP_SPRING}
                                        type="button"
                                        className="job-filter-secondary min-h-12 min-w-0 rounded-2xl px-3 py-3.5 text-[12px] font-semibold"
                                    >
                                        Filter zurücksetzen
                                    </motion.button>
                                )}
                                <motion.button
                                    onClick={onClose}
                                    whileTap={tapScale}
                                    transition={CHIP_SPRING}
                                    type="button"
                                    className="job-filter-cta min-h-12 min-w-0 rounded-2xl px-4 py-3.5 text-sm font-semibold"
                                >
                                    {hasChanges ? "Anwenden" : "Schließen"}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
