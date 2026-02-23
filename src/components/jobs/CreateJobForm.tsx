"use client";

import { createJob } from "@/app/app-home/offers/actions";
import { Loader2, Save, MapPin, FileEdit, AlertTriangle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useActionState, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ErrorInfo } from "@/lib/types/jobbridge";
import Link from "next/link";
import { LocationAutocomplete, LocationDetails } from "@/components/ui/LocationAutocomplete";
import { useJobFormPersistence } from "@/hooks/use-job-persistence";
import { motion, AnimatePresence } from "framer-motion";
import { JOB_CATEGORIES, PaymentType } from "@/lib/constants/jobCategories";

function SubmitButtons() {
    const { pending } = useFormStatus();
    return (
        <div className="flex gap-3">
            <button
                type="submit"
                name="intent"
                value="draft"
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 hover:border-white/20"
            >
                {pending ? <Loader2 size={18} className="animate-spin" /> : <FileEdit size={18} />}
                <span>Entwurf</span>
            </button>
            <button
                type="submit"
                name="intent"
                value="create"
                disabled={pending}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
                {pending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Veröffentlichen</span>
            </button>
        </div>
    );
}

type CreateJobFormState =
    | null
    | { status: "error"; error: ErrorInfo; debug?: Record<string, unknown> }
    | { status: "partial"; jobId: string; error: ErrorInfo; debug?: Record<string, unknown> };

type DefaultLocation = {
    id: string;
    public_label: string | null;
    address_line1: string | null;
    city: string | null;
    postal_code: string | null;
};

export function CreateJobForm({ defaultLocation, marketName }: { defaultLocation?: DefaultLocation | null, marketName: string }) {
    const [state, formAction] = useActionState<CreateJobFormState, FormData>(createJob, null);

    // Persistence Hook
    const { draft, isLoaded, saveDraft, clearDraft } = useJobFormPersistence();

    // Local State (Controlled Inputs)
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [wage, setWage] = useState("");
    const [categoryId, setCategoryId] = useState<string>("");
    const [paymentType, setPaymentType] = useState<PaymentType>("hourly");
    const [useCustomLocation, setUseCustomLocation] = useState(!defaultLocation);
    const [location, setLocation] = useState<LocationDetails | null>(null);

    // Cinematic Scroll Reference
    const titleRef = useRef<HTMLDivElement>(null);

    // Load from Draft on Mount
    useEffect(() => {
        if (isLoaded && draft) {
            if (draft.title) setTitle(draft.title);
            if (draft.description) setDescription(draft.description);
            if (draft.wage) setWage(draft.wage);
            if (draft.category) setCategoryId(draft.category);
            if (draft.paymentType) setPaymentType(draft.paymentType as "hourly" | "fixed");

            // Logic: If draft has a specific location stored, we use custom mode.
            // If draft explicitly says "using default" (we'd need to store that boolean), currently we infer.
            if (draft.location) {
                setUseCustomLocation(true);
                setLocation({
                    address_line1: draft.location.address,
                    lat: draft.location.lat ?? 0,
                    lng: draft.location.lng ?? 0,
                    city: draft.location.city || "",
                    postal_code: draft.location.zip || "",
                    public_label: draft.location.label || ""
                });
            } else if (draft.isDefaultLocation === false) {
                // If we tracked this flag. For now, if location is missing but draft exists, maybe they cleared it?
                // Let's stick to: if location present -> custom.
            }
        }
    }, [isLoaded]); // Run once when loaded

    // Save to Draft on Change (Debounced)
    useEffect(() => {
        if (!isLoaded) return;
        const timer = setTimeout(() => {
            saveDraft({
                title,
                description,
                wage,
                category: categoryId,
                paymentType: paymentType,
                location: location ? {
                    address: location.address_line1,
                    lat: location.lat,
                    lng: location.lng,
                    city: location.city,
                    zip: location.postal_code,
                    label: location.public_label,
                    isDefault: !useCustomLocation // Persist specific location flag if needed inside location object
                } : undefined,
                isDefaultLocation: !useCustomLocation // Persist top-level preference
            });
        }, 800);
        return () => clearTimeout(timer);
    }, [title, description, wage, location, isLoaded, saveDraft]);

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="use_default_location" value={(!useCustomLocation && defaultLocation) ? "true" : "false"} />
            <input type="hidden" name="category" value={categoryId} />
            <input type="hidden" name="payment_type" value={paymentType} />
            {state?.status === "partial" && <input type="hidden" name="job_id" value={state.jobId} />}

            {/* Hidden inputs for Location Data (to be picked up by Server Action) */}
            {useCustomLocation && location && (
                <>
                    <input type="hidden" name="public_lat" value={location.lat} />
                    <input type="hidden" name="public_lng" value={location.lng} />
                    <input type="hidden" name="address_full" value={location.public_label} />
                    {/* Fallback address string if needed */}
                </>
            )}

            <div className="space-y-4">
                {/* Draft Recovery Indicator */}
                {isLoaded && draft && (
                    <div className="flex items-center justify-between text-[10px] text-indigo-400 px-1">
                        <span className="flex items-center gap-1.5">
                            <Save size={10} />
                            Entwurf automatisch wiederhergestellt
                        </span>
                        <button
                            type="button"
                            onClick={() => { clearDraft(); setTitle(""); setDescription(""); setWage(""); setCategoryId(""); setPaymentType("hourly"); setLocation(null); setUseCustomLocation(!defaultLocation); }}
                            className="text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                            <Trash2 size={10} />
                            Verwerfen
                        </button>
                    </div>
                )}

                {/* Category Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Welche Art von Hilfe suchst du? *</label>
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
                                        if (!draft || !draft.paymentType) {
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

                <div ref={titleRef} className="scroll-mt-8">
                    <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Titel des Jobs *</label>
                    <input
                        type="text"
                        name="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="z.B. Rasenmähen am Wochenende"
                        className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Beschreibung</label>
                    <textarea
                        name="description"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Beschreibe, was zu tun ist..."
                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed"
                    />
                </div>

                {/* Location Section */}
                <div className="pt-2 space-y-3">
                    <label className="block text-sm font-medium text-slate-300">Einsatzort *</label>

                    {defaultLocation && (
                        <div
                            onClick={() => { setUseCustomLocation(false); setLocation(null); }}
                            className={cn(
                                "cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 group relative overflow-hidden",
                                !useCustomLocation
                                    ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
                                    : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors",
                                !useCustomLocation ? "border-indigo-400 bg-indigo-400" : "border-slate-600"
                            )}>
                                {!useCustomLocation && <div className="w-1.5 h-1.5 rounded-full bg-black mb-px" />}
                            </div>

                            <div className="flex-1">
                                <h4 className={cn("text-sm font-bold", !useCustomLocation ? "text-indigo-300" : "text-slate-300")}>
                                    Standard-Adresse (Privat)
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {defaultLocation.public_label || "Mein Ort"} <br />
                                    <span className="opacity-70">{defaultLocation.address_line1}, {defaultLocation.city}</span>
                                </p>
                            </div>
                            <MapPin className={cn("absolute right-4 top-4 transition-colors", !useCustomLocation ? "text-indigo-500/20" : "text-slate-700")} size={40} />
                        </div>
                    )}

                    <div
                        onClick={() => setUseCustomLocation(true)}
                        className={cn(
                            "cursor-pointer p-4 rounded-xl border transition-all space-y-3",
                            useCustomLocation
                                ? "bg-[#0F1014] border-indigo-500/30"
                                : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors",
                                useCustomLocation ? "border-indigo-400 bg-indigo-400" : "border-slate-600"
                            )}>
                                {useCustomLocation && <div className="w-1.5 h-1.5 rounded-full bg-black mb-px" />}
                            </div>
                            <div className="flex-1">
                                <h4 className={cn("text-sm font-bold mb-1", useCustomLocation ? "text-indigo-300" : "text-slate-300")}>
                                    Anderer Einsatzort
                                </h4>

                                {useCustomLocation && (
                                    <div onClick={e => e.stopPropagation()}>
                                        <LocationAutocomplete
                                            onSelect={setLocation}
                                            defaultValue={location?.public_label}
                                            placeholder="Adresse suchen (z.B. Stadtpark Rheinbach)..."
                                            className="mt-2"
                                        />

                                        {/* Warning for Custom Location */}
                                        {location && (
                                            <div className="mt-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex gap-2.5 items-start animate-in fade-in slide-in-from-top-2">
                                                <AlertTriangle size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                                <div className="text-xs text-slate-300 leading-relaxed">
                                                    <strong className="text-indigo-300">Hinweis:</strong> Da dieser Job an einem anderen Ort stattfindet, wird er vor der Veröffentlichung kurz vom JobBridge-Team überprüft.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Bezahlung</label>
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
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

                    <div>
                        <label htmlFor="wage" className="block text-sm font-medium text-slate-300 mb-2">
                            {paymentType === "hourly" ? "Stundenlohn (€)" : "Pauschale (€)"} *
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                name="wage"
                                required
                                min="0"
                                step="0.50"
                                value={wage}
                                onChange={(e) => setWage(e.target.value)}
                                placeholder={paymentType === "hourly" ? "15.00" : "50.00"}
                                className="w-full pl-4 pr-12 py-1.5 h-[42px] rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
            </div>

            <div className="pt-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Reichweite</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="cursor-pointer">
                        <input type="radio" name="reach" value="internal_rheinbach" defaultChecked className="peer sr-only" />
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 peer-checked:bg-indigo-500/10 peer-checked:border-indigo-500/50 peer-checked:ring-1 peer-checked:ring-indigo-500/20 transition-all hover:bg-white/5 h-full">
                            <h4 className="font-bold text-sm text-white peer-checked:text-indigo-300">Lokal in {marketName}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Nur für Nutzer aus {marketName} sichtbar. Perfekt für Nachbarschaftshilfe.</p>
                        </div>
                    </label>
                    <label className="cursor-pointer">
                        <input type="radio" name="reach" value="extended" className="peer sr-only" />
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 peer-checked:bg-indigo-500/10 peer-checked:border-indigo-500/50 peer-checked:ring-1 peer-checked:ring-indigo-500/20 transition-all hover:bg-white/5 h-full relative overflow-hidden">
                            <h4 className="font-bold text-sm text-white peer-checked:text-indigo-300">Überregional</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Auch für Nutzer aus umliegenden Städten sichtbar.</p>
                        </div>
                    </label>
                </div>
            </div>

            {
                state?.status === "error" && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                        <div className="font-semibold flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Fehler
                        </div>
                        <div className="mt-1 font-mono text-xs break-words pl-6">
                            {state.error.code ? `${state.error.code}: ` : ""}{state.error.message}
                        </div>
                    </div>
                )
            }

            {
                state?.status === "partial" && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                        {/* ... Keep Partial Logic ... */}
                        <div className="font-semibold">Job erstellt, aber unvollstaendig</div>
                        <div className="mt-1 text-sm text-amber-200/90">
                            Der Job wurde erstellt, aber die privaten Details konnten nicht gespeichert werden.
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="submit"
                                name="intent"
                                value="retry_private_details"
                                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/25 text-amber-100 border border-amber-500/30 text-sm font-semibold"
                            >
                                Private Details erneut speichern
                            </button>
                        </div>
                    </div>
                )
            }

            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/5 mt-6 gap-4">
                <p className="text-xs text-slate-500 max-w-xs">
                    {useCustomLocation
                        ? "Dieser Job wird nach Überprüfung freigeschaltet."
                        : `Dein Job wird für Jobsuchende in ${marketName} sofort sichtbar sein.`
                    }
                </p>
                <SubmitButtons />
            </div>
        </form >
    );
}
