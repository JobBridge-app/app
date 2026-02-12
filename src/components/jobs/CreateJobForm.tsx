"use client";

import { createJob } from "@/app/app-home/offers/actions";
import { Loader2, Save, MapPin, FileEdit, AlertTriangle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useActionState, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ErrorInfo } from "@/lib/types/jobbridge";
import Link from "next/link";
import { LocationAutocomplete, LocationDetails } from "@/components/ui/LocationAutocomplete";
import { useJobFormPersistence } from "@/hooks/use-job-persistence";

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

export function CreateJobForm({ defaultLocation }: { defaultLocation?: DefaultLocation | null }) {
    const [state, formAction] = useActionState<CreateJobFormState, FormData>(createJob, null);

    // Persistence Hook
    const { draft, isLoaded, saveDraft, clearDraft } = useJobFormPersistence();

    // Local State (Controlled Inputs)
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [wage, setWage] = useState("");
    const [useCustomLocation, setUseCustomLocation] = useState(!defaultLocation);
    const [location, setLocation] = useState<LocationDetails | null>(null);

    // Load from Draft on Mount
    useEffect(() => {
        if (isLoaded && draft) {
            if (draft.title) setTitle(draft.title);
            if (draft.description) setDescription(draft.description);
            if (draft.wage) setWage(draft.wage);

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
                location: location ? {
                    address: location.address_line1,
                    lat: location.lat,
                    lng: location.lng,
                    city: location.city,
                    zip: location.postal_code,
                    label: location.public_label
                } : undefined,
                // We could store useCustomLocation too if needed
            });
        }, 800);
        return () => clearTimeout(timer);
    }, [title, description, wage, location, isLoaded, saveDraft]);

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="use_default_location" value={(!useCustomLocation && defaultLocation) ? "true" : "false"} />
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
                            onClick={() => { clearDraft(); setTitle(""); setDescription(""); setWage(""); setLocation(null); setUseCustomLocation(!defaultLocation); }}
                            className="text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                            <Trash2 size={10} />
                            Verwerfen
                        </button>
                    </div>
                )}

                <div>
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

                <div>
                    <label htmlFor="wage" className="block text-sm font-medium text-slate-300 mb-1">Stundenlohn (€)</label>
                    <input
                        type="number"
                        name="wage"
                        min="0"
                        step="0.50"
                        value={wage}
                        onChange={(e) => setWage(e.target.value)}
                        placeholder="12.00"
                        className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
            </div>

            {state?.status === "error" && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                    <div className="font-semibold flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Fehler
                    </div>
                    <div className="mt-1 font-mono text-xs break-words pl-6">
                        {state.error.code ? `${state.error.code}: ` : ""}{state.error.message}
                    </div>
                </div>
            )}

            {state?.status === "partial" && (
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
            )}

            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/5 mt-6 gap-4">
                <p className="text-xs text-slate-500 max-w-xs">
                    {useCustomLocation
                        ? "Dieser Job wird nach Überprüfung freigeschaltet."
                        : "Dein Job wird für Jobsuchende in Rheinbach sofort sichtbar sein."
                    }
                </p>
                <SubmitButtons />
            </div>
        </form>
    );
}
