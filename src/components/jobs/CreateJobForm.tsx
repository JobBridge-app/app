"use client";

import { createJob } from "@/app/app-home/offers/actions";
import { AlertTriangle, CheckCircle2, FileEdit, Loader2, MapPin, Save, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useActionState, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ErrorInfo } from "@/lib/types/jobbridge";
import { LocationAutocomplete, LocationDetails } from "@/components/ui/LocationAutocomplete";
import { useJobFormPersistence } from "@/hooks/use-job-persistence";
import { motion, AnimatePresence } from "framer-motion";
import { JOB_CATEGORIES, PaymentType } from "@/lib/constants/jobCategories";

function SubmitButtons() {
    const { pending } = useFormStatus();
    const [activeIntent, setActiveIntent] = useState<"draft" | "create" | null>(null);

    useEffect(() => {
        if (!pending) setActiveIntent(null);
    }, [pending]);

    const draftPending = pending && activeIntent === "draft";
    const publishPending = pending && activeIntent === "create";

    return (
        <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:min-w-[430px] sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.25fr)]">
            <button
                type="submit"
                name="intent"
                value="draft"
                disabled={pending}
                onClick={() => setActiveIntent("draft")}
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.075] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
                {draftPending ? <Loader2 size={17} className="animate-spin" /> : <FileEdit size={17} className="text-slate-400 transition-colors group-hover:text-white" />}
                <span>Entwurf</span>
            </button>
            <button
                type="submit"
                name="intent"
                value="create"
                disabled={pending}
                onClick={() => setActiveIntent("create")}
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border border-indigo-200/25 bg-[linear-gradient(135deg,#4f46e5,#2563eb_55%,#0891b2)] px-5 text-sm font-bold text-white shadow-[0_18px_42px_rgba(37,99,235,0.26),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[filter,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(37,99,235,0.34),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-200/35 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
            >
                {publishPending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} className="transition-transform group-hover:scale-105" />}
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

const inputClass = "w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-[border-color,background-color,box-shadow] placeholder:text-slate-600 focus:border-indigo-300/45 focus:bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/15";
const fieldLabelClass = "block text-sm font-semibold text-slate-200 mb-2";
const sectionClass = "border-t border-white/[0.07] pt-5";

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
    }, [title, description, wage, categoryId, paymentType, location, useCustomLocation, isLoaded, saveDraft]);

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

            <div className="space-y-6">
                {isLoaded && draft && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-300/15 bg-indigo-400/8 px-3 py-2 text-xs text-indigo-200">
                        <span className="flex items-center gap-2 font-semibold">
                            <Save size={13} />
                            Entwurf automatisch wiederhergestellt
                        </span>
                        <button
                            type="button"
                            onClick={() => { clearDraft(); setTitle(""); setDescription(""); setWage(""); setCategoryId(""); setPaymentType("hourly"); setLocation(null); setUseCustomLocation(!defaultLocation); }}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                        >
                            <Trash2 size={12} />
                            Verwerfen
                        </button>
                    </div>
                )}

                {/* Category Selection */}
                <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-slate-200">Welche Art von Hilfe suchst du? *</label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                                    }}
                                    className={cn(
                                        "group relative flex min-h-[104px] flex-col items-center justify-center overflow-hidden rounded-xl border p-4 transition-[background-color,border-color,box-shadow,transform] duration-300",
                                        isSelected
                                            ? "border-indigo-300/55 bg-indigo-400/12 shadow-[0_18px_45px_rgba(79,70,229,0.15),inset_0_1px_0_rgba(255,255,255,0.09)] ring-1 ring-indigo-300/30"
                                            : "border-white/[0.08] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.055]"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/70 to-transparent" />
                                    )}
                                    {isSelected && <CheckCircle2 size={15} className="absolute right-3 top-3 text-indigo-200" />}
                                    <motion.div
                                        animate={{
                                            scale: isSelected ? 1.1 : 1,
                                            y: isSelected ? -2 : 0
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        <Icon
                                            size={28}
                                            strokeWidth={1.5}
                                            className={cn(
                                                "mb-3 transition-colors duration-300",
                                                isSelected ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-200"
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

                <div ref={titleRef} className={cn(sectionClass, "scroll-mt-8")}>
                    <label htmlFor="title" className={fieldLabelClass}>Titel des Jobs *</label>
                    <input
                        type="text"
                        name="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="z.B. Rasenmähen am Wochenende"
                        className={cn(inputClass, "h-12")}
                    />
                </div>

                <div>
                    <label htmlFor="description" className={fieldLabelClass}>Beschreibung *</label>
                    <textarea
                        name="description"
                        required
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Beschreibe, was zu tun ist..."
                        className={cn(inputClass, "resize-y py-3 leading-relaxed")}
                    />
                </div>

                {/* Location Section */}
                <div className={cn(sectionClass, "space-y-3")}>
                    <label className={fieldLabelClass}>Einsatzort *</label>

                    {defaultLocation && (
                        <div
                            onClick={() => { setUseCustomLocation(false); setLocation(null); }}
                            className={cn(
                                "group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-xl border p-4 transition-[background-color,border-color,box-shadow,transform]",
                                !useCustomLocation
                                    ? "border-indigo-300/50 bg-indigo-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-indigo-300/20"
                                    : "border-white/[0.08] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.055]"
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors",
                                !useCustomLocation ? "border-indigo-300 bg-indigo-300" : "border-slate-600"
                            )}>
                                {!useCustomLocation && <div className="w-1.5 h-1.5 rounded-full bg-black mb-px" />}
                            </div>

                            <div className="flex-1">
                                <h4 className={cn("text-sm font-bold", !useCustomLocation ? "text-indigo-100" : "text-slate-300")}>
                                    Standard-Adresse (Privat)
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {defaultLocation.public_label || "Mein Ort"} <br />
                                    <span className="opacity-70">{defaultLocation.address_line1}, {defaultLocation.city}</span>
                                </p>
                            </div>
                            <MapPin className={cn("absolute right-4 top-4 transition-colors", !useCustomLocation ? "text-indigo-300/20" : "text-slate-700")} size={40} />
                        </div>
                    )}

                    <div
                        onClick={() => setUseCustomLocation(true)}
                        className={cn(
                            "cursor-pointer space-y-3 rounded-xl border p-4 transition-[background-color,border-color,box-shadow,transform]",
                            useCustomLocation
                                ? "border-indigo-300/35 bg-[#0F1014] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                                : "border-white/[0.08] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.055]"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors",
                                useCustomLocation ? "border-indigo-300 bg-indigo-300" : "border-slate-600"
                            )}>
                                {useCustomLocation && <div className="w-1.5 h-1.5 rounded-full bg-black mb-px" />}
                            </div>
                            <div className="flex-1">
                                <h4 className={cn("text-sm font-bold mb-1", useCustomLocation ? "text-indigo-100" : "text-slate-300")}>
                                    Anderer Einsatzort
                                </h4>

                                {useCustomLocation && (
                                    <div onClick={e => e.stopPropagation()}>
                                        <LocationAutocomplete
                                            onSelect={setLocation}
                                            defaultValue={location?.public_label}
                                            placeholder="Adresse suchen (z.B. Stadtpark Rheinbach)..."
                                            className="job-create-location-search mt-2"
                                        />

                                        {/* Warning for Custom Location */}
                                        {location && (
                                            <div className="mt-3 flex animate-in items-start gap-2.5 rounded-lg border border-indigo-300/20 bg-indigo-400/10 p-3 fade-in slide-in-from-top-2">
                                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-indigo-300" />
                                                <div className="text-xs text-slate-300 leading-relaxed">
                                                    <strong className="text-indigo-200">Hinweis:</strong> Da dieser Job an einem anderen Ort stattfindet, wird er vor der Veröffentlichung kurz vom JobBridge-Team überprüft.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cn(sectionClass, "space-y-4")}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className={fieldLabelClass}>Bezahlung</label>
                        <div className="flex rounded-xl border border-white/10 bg-slate-950/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                            <button
                                type="button"
                                onClick={() => setPaymentType("hourly")}
                                className={cn(
                                    "flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200",
                                    paymentType === "hourly" ? "bg-indigo-400/18 text-indigo-100 shadow-sm" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                                )}
                            >
                                Stundenlohn
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentType("fixed")}
                                className={cn(
                                    "flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200",
                                    paymentType === "fixed" ? "bg-indigo-400/18 text-indigo-100 shadow-sm" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                                )}
                            >
                                Pauschale
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="wage" className={fieldLabelClass}>
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
                                className={cn(inputClass, "h-[46px] pr-12")}
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
                            <div className="relative rounded-xl border border-indigo-300/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(14,165,233,0.06))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                {(() => {
                                    const selectedCat = JOB_CATEGORIES.find(c => c.id === categoryId);
                                    if (!selectedCat) return null;

                                    const avg = ((selectedCat.recommendedWage.min + selectedCat.recommendedWage.max) / 2).toFixed(2);

                                    return (
                                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-sm font-bold text-indigo-100 mb-0.5">
                                                    Unsere Empfehlung für eine faire Vergütung
                                                </h4>
                                                <p className="text-xs text-indigo-100/78 leading-relaxed m-0">
                                                    {selectedCat.hint} Empfehlung: <strong className="rounded bg-indigo-300/15 px-1 py-0.5 text-white">{selectedCat.recommendedWage.min} - {selectedCat.recommendedWage.max} €</strong>.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWage(avg);
                                                    setPaymentType(selectedCat.defaultPaymentType);
                                                }}
                                                className="shrink-0 rounded-lg border border-indigo-200/25 bg-indigo-300/15 px-4 py-2 text-center text-xs font-bold text-indigo-100 shadow-sm transition-all hover:bg-indigo-300/24 hover:text-white"
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
            </div>

            <div className={cn(sectionClass, "space-y-3")}>
                <label className={fieldLabelClass}>Reichweite</label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="cursor-pointer">
                        <input type="radio" name="reach" value="internal_rheinbach" defaultChecked className="peer sr-only" />
                        <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-white/16 hover:bg-white/[0.055] peer-checked:border-indigo-300/50 peer-checked:bg-indigo-400/10 peer-checked:ring-1 peer-checked:ring-indigo-300/20">
                            <h4 className="text-sm font-bold text-white peer-checked:text-indigo-100">Lokal in {marketName}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Nur für Nutzer aus {marketName} sichtbar. Perfekt für Nachbarschaftshilfe.</p>
                        </div>
                    </label>
                    <label className="cursor-pointer">
                        <input type="radio" name="reach" value="extended" className="peer sr-only" />
                        <div className="relative h-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-white/16 hover:bg-white/[0.055] peer-checked:border-indigo-300/50 peer-checked:bg-indigo-400/10 peer-checked:ring-1 peer-checked:ring-indigo-300/20">
                            <h4 className="text-sm font-bold text-white peer-checked:text-indigo-100">Überregional</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Auch für Nutzer aus umliegenden Städten sichtbar.</p>
                        </div>
                    </label>
                </div>
            </div>

            {
                state?.status === "error" && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
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
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
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
                                className="rounded-xl border border-amber-300/30 bg-amber-400/16 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/24"
                            >
                                Private Details erneut speichern
                            </button>
                        </div>
                    </div>
                )
            }

            <div className="mt-6 flex flex-col justify-between gap-4 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center">
                <p className="max-w-xs text-xs leading-5 text-slate-500">
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
