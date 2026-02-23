"use client";

import { X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";

export type SortOption = "distance" | "newest" | "wage_desc";

export interface FilterState {
    categories: string[];
    maxDistanceKm: number | null;
}

export const DEFAULT_FILTER_STATE: FilterState = {
    categories: [],
    maxDistanceKm: null,
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "distance", label: "Entfernung (nächste zuerst)" },
    { value: "newest", label: "Neueste Jobs zuerst" },
    { value: "wage_desc", label: "Vergütung (höchste zuerst)" },
];

const DISTANCE_OPTIONS = [5, 10, 20, 50];

interface JobFilterSortPanelProps {
    sortOption: SortOption;
    filterState: FilterState;
    onSortChange: (sort: SortOption) => void;
    onFilterChange: (filter: FilterState) => void;
    onClose: () => void;
    onReset: () => void;
    hasActiveFilters: boolean;
}

export function JobFilterSortPanel({
    sortOption,
    filterState,
    onSortChange,
    onFilterChange,
    onClose,
    onReset,
    hasActiveFilters,
}: JobFilterSortPanelProps) {
    const toggleCategory = (id: string) => {
        const next = filterState.categories.includes(id)
            ? filterState.categories.filter((c) => c !== id)
            : [...filterState.categories, id];
        onFilterChange({ ...filterState, categories: next });
    };

    const setMaxDistance = (km: number | null) => {
        onFilterChange({ ...filterState, maxDistanceKm: km });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-sm bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
                {/* Drag handle (mobile) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full sm:hidden" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                        <SlidersHorizontal size={18} className="text-indigo-400" />
                        Filter &amp; Sortierung
                    </div>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={onReset}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                            >
                                Zurücksetzen
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
                    {/* Sort */}
                    <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                            <ArrowUpDown size={13} />
                            Sortierung
                        </h4>
                        <div className="space-y-1.5">
                            {SORT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => onSortChange(opt.value)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                                        sortOption === opt.value
                                            ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                            : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                                            sortOption === opt.value
                                                ? "border-indigo-400 bg-indigo-400"
                                                : "border-slate-600"
                                        )}
                                    >
                                        {sortOption === opt.value && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#18181b]" />
                                        )}
                                    </span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Category filter */}
                    <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                            Kategorie
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {JOB_CATEGORIES.map((cat) => {
                                const isActive = filterState.categories.includes(cat.id);
                                const CatIcon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                                            isActive
                                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                                        )}
                                    >
                                        <CatIcon size={12} />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Max distance */}
                    <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                            Maximale Entfernung
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setMaxDistance(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                                    filterState.maxDistanceKm === null
                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                        : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                                )}
                            >
                                Alle
                            </button>
                            {DISTANCE_OPTIONS.map((km) => (
                                <button
                                    key={km}
                                    onClick={() => setMaxDistance(km)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                                        filterState.maxDistanceKm === km
                                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                            : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    {km} km
                                </button>
                            ))}
                        </div>
                        {filterState.maxDistanceKm !== null && (
                            <p className="text-xs text-slate-500 mt-2">
                                Nur Jobs bis {filterState.maxDistanceKm} km werden angezeigt. Jobs ohne Entfernungsangabe werden ausgeblendet.
                            </p>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
                    >
                        Anwenden
                    </button>
                </div>
            </div>
        </div>
    );
}
