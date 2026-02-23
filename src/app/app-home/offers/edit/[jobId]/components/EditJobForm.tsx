"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/types/supabase";
import { updateJobAction } from "./actions";
import { Loader2, MapPin, Lock, AlertTriangle } from "lucide-react";
import { JOB_CATEGORIES } from "@/lib/constants/jobCategories";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Job = Database['public']['Tables']['jobs']['Row'] & { reach?: string | null };

export function EditJobForm({ job, marketName }: { job: Job, marketName: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categoryId, setCategoryId] = useState(job.category || "");
    const [paymentType, setPaymentType] = useState<"hourly" | "fixed">(job.payment_type as any || "hourly");
    const [wage, setWage] = useState(job.wage_hourly ? String(job.wage_hourly) : "");

    // Cinematic Scroll Reference
    const titleRef = useRef<HTMLDivElement>(null);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        // Append react state to formData
        formData.set("category", categoryId);
        formData.set("payment_type", paymentType);

        try {
            const result = await updateJobAction(job.id, formData);
            if (result.success) {
                router.push("/app-home/offers");
                router.refresh();
            } else {
                setError(result.error || "Fehler beim Speichern");
            }
        } catch (e) {
            setError("Ein unerwarteter Fehler ist aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Category Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Kategorie *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {JOB_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isSelected = categoryId === category.id;

                        return (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => {
                                    setCategoryId(category.id);
                                    if (job.category !== category.id && wage === String(job.wage_hourly)) {
                                        setPaymentType(category.defaultPaymentType);
                                    }
                                    // Cinematic Auto-Scroll after animation starts
                                    setTimeout(() => {
                                        titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }, 150);
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                                    isSelected
                                        ? "bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                                        : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
                                )}
                                <motion.div
                                    animate={{
                                        scale: isSelected ? 1.15 : 1,
                                        rotate: isSelected ? -5 : 0
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                >
                                    <Icon
                                        size={28}
                                        strokeWidth={1.5}
                                        className={cn(
                                            "mb-3 transition-colors duration-300",
                                            isSelected ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"
                                        )}
                                    />
                                </motion.div>
                                <span className={cn(
                                    "text-xs font-semibold text-center transition-colors duration-300",
                                    isSelected ? "text-indigo-200" : "text-slate-300"
                                )}>
                                    {category.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>


            <div ref={titleRef} className="space-y-2 scroll-mt-8">
                <label htmlFor="title" className="block text-sm font-medium text-slate-300">Titel</label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    defaultValue={job.title || ""}
                    required
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Beschreibung</label>
                <textarea
                    id="description"
                    name="description"
                    defaultValue={job.description || ""}
                    required
                    rows={5}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 resize-none"
                />
            </div>

            {/* Read-only Location Display */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Einsatzort</label>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 opacity-70 cursor-not-allowed">
                    <div className="p-2 rounded-full bg-white/5">
                        <MapPin className="text-slate-400" size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-medium text-slate-300">
                            {job.public_location_label || "Standard-Adresse"}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Lock size={10} />
                            <span>Adresse kann nachträglich nicht geändert werden</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Bezahlung</label>
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setPaymentType("hourly")}
                            className={cn(
                                "flex-1 text-sm py-1.5 rounded-lg font-medium transition-all duration-200",
                                paymentType === "hourly" ? "bg-indigo-500/20 text-indigo-300 shadow-sm" : "text-slate-400 hover:text-slate-300"
                            )}
                        >
                            Stundenlohn
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentType("fixed")}
                            className={cn(
                                "flex-1 text-sm py-1.5 rounded-lg font-medium transition-all duration-200",
                                paymentType === "fixed" ? "bg-indigo-500/20 text-indigo-300 shadow-sm" : "text-slate-400 hover:text-slate-300"
                            )}
                        >
                            Pauschale
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="wage_hourly" className="block text-sm font-medium text-slate-300">
                        {paymentType === "hourly" ? "Stundenlohn (€)" : "Pauschale (€)"} *
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            id="wage_hourly"
                            name="wage_hourly"
                            value={wage}
                            onChange={(e) => setWage(e.target.value)}
                            required
                            min="0"
                            step="0.50"
                            className="w-full pl-4 pr-12 py-1.5 h-[42px] bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm pointer-events-none">
                            € {paymentType === "hourly" && <span className="text-xs">/h</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compensation Suggestion (Animated) moved below inputs */}
            <AnimatePresence>
                {categoryId && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-900/10 border border-indigo-500/20 relative">
                            {(() => {
                                const selectedCat = JOB_CATEGORIES.find(c => c.id === categoryId);
                                if (!selectedCat) return null;

                                const avg = ((selectedCat.recommendedWage.min + selectedCat.recommendedWage.max) / 2).toFixed(2);

                                return (
                                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-300 mb-0.5">
                                                Unsere Empfehlung für eine faire Vergütung
                                            </h4>
                                            <p className="text-xs text-indigo-200/80 leading-relaxed m-0">
                                                {selectedCat.hint} Um schnell hilfsbereite Menschen zu finden, empfehlen wir für diese Kategorie <strong className="text-white bg-indigo-500/20 px-1 py-0.5 rounded">{selectedCat.recommendedWage.min} – {selectedCat.recommendedWage.max} €</strong>.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWage(avg);
                                                setPaymentType(selectedCat.defaultPaymentType);
                                            }}
                                            className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 hover:text-white transition-all border border-indigo-500/30 shadow-sm text-center"
                                        >
                                            {avg} € {selectedCat.defaultPaymentType === 'hourly' ? '/ Std' : 'pau.'} übernehmen
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Reach / Visibility Section */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Reichweite</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="cursor-pointer">
                            <input
                                type="radio"
                                name="reach"
                                value="internal_rheinbach"
                                defaultChecked={job.reach === 'internal_rheinbach' || !job.reach}
                                className="peer sr-only"
                            />
                            <div className="p-4 rounded-xl bg-slate-950/50 border border-white/10 peer-checked:bg-indigo-500/10 peer-checked:border-indigo-500/50 peer-checked:ring-1 peer-checked:ring-indigo-500/20 transition-all hover:bg-white/5 h-full">
                                <h4 className="font-bold text-sm text-white peer-checked:text-indigo-300">Lokal in {marketName}</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Nur für Nutzer aus {marketName} sichtbar.</p>
                            </div>
                        </label>
                        <label className="cursor-pointer">
                            <input
                                type="radio"
                                name="reach"
                                value="extended"
                                defaultChecked={job.reach === 'extended'}
                                className="peer sr-only"
                            />
                            <div className="p-4 rounded-xl bg-slate-950/50 border border-white/10 peer-checked:bg-indigo-500/10 peer-checked:border-indigo-500/50 peer-checked:ring-1 peer-checked:ring-indigo-500/20 transition-all hover:bg-white/5 h-full relative overflow-hidden">
                                <h4 className="font-bold text-sm text-white peer-checked:text-indigo-300">Überregional</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Auch für Nutzer aus umliegenden Städten sichtbar.</p>
                            </div>
                        </label>
                    </div>
                </div>
                <div className="space-y-2">
                    <label htmlFor="status" className="block text-sm font-medium text-slate-300">Status</label>
                    <select
                        id="status"
                        name="status"
                        defaultValue={job.status || "open"}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    >
                        <option value="open">Aktiv (Sichtbar)</option>
                        <option value="closed">Geschlossen (Archiviert)</option>
                        {/* Add more statuses if needed, e.g. draft */}
                        <option value="draft">Entwurf</option>
                    </select>
                </div>
            </div>

            <div className="pt-8 flex justify-end gap-3 border-t border-white/10">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.back()}
                    disabled={isLoading}
                >
                    Abbrechen
                </Button>
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[120px]"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Speichern
                        </>
                    ) : (
                        "Änderungen speichern"
                    )}
                </Button>
            </div>
        </form >
    );
}
