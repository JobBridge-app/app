import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ShieldCheck, CheckCircle2, Search, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { LocationAutocomplete, LocationDetails } from "@/components/ui/LocationAutocomplete";

type ProviderVerificationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmitted: () => void;
};

export function ProviderVerificationModal({ isOpen, onClose, onSubmitted }: ProviderVerificationModalProps) {
    const [street, setStreet] = useState("");
    const [houseNumber, setHouseNumber] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);

    const [isAddressLocked, setIsAddressLocked] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setStreet("");
            setHouseNumber("");
            setCity("");
            setZip("");
            setLatitude(null);
            setLongitude(null);
            setIsAddressLocked(false);
            setError(null);
            setIsNoticeOpen(false);
        }
    }, [isOpen]);

    const handleLocationSelect = (loc: LocationDetails) => {
        const foundHouseNumber = loc.house_number;

        setStreet(loc.address_line1);
        setHouseNumber(foundHouseNumber || "");
        setCity(loc.city || "");
        setZip(loc.postal_code || "");
        setLatitude(loc.lat);
        setLongitude(loc.lng);
        setIsAddressLocked(true);
        setError(null);
    };

    const handleResetAddress = () => {
        setStreet("");
        setHouseNumber("");
        setCity("");
        setZip("");
        setLatitude(null);
        setLongitude(null);
        setIsAddressLocked(false);
    };

    const handleClose = () => {
        if (isSuccess) onSubmitted();
        onClose();
    };

    const handleSubmit = async () => {
        if (!street.trim() || !houseNumber.trim() || !city.trim() || !zip.trim() || latitude === null || longitude === null) {
            setError("Bitte wähle eine vollständige Adresse aus.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { data: result, error: updateError } = await supabaseBrowser.rpc(
                "request_provider_verification",
                {
                    p_street: street.trim(),
                    p_house_number: houseNumber.trim(),
                    p_city: city.trim(),
                    p_zip: zip.trim(),
                    p_lat: latitude,
                    p_lng: longitude,
                },
            );

            if (updateError) throw updateError;

            const response = result && typeof result === "object" && !Array.isArray(result)
                ? result as { ok?: boolean; error?: string }
                : null;
            if (!response?.ok) {
                throw new Error(response?.error ?? "verification_request_failed");
            }

            setIsSuccess(true);
        } catch (err) {
            console.error("Verification error:", err);
            setError("Fehler beim Speichern. Bitte versuche es erneut.");
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="provider-verification-backdrop fixed inset-0 backdrop-blur-md" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="provider-verification-modal relative w-full max-w-xl transform overflow-visible rounded-[2rem] border p-0 text-left align-middle transition-all">
                                {isSuccess ? (
                                    <div className="provider-verification-success relative z-10 flex flex-col items-center px-6 py-12 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                                            <CheckCircle2 size={28} className="text-emerald-500" />
                                        </div>
                                        <div className="mt-5 max-w-sm space-y-2">
                                            <Dialog.Title as="h3" className="text-xl font-semibold tracking-tight text-white">Zur Prüfung eingereicht</Dialog.Title>
                                            <Dialog.Description className="text-sm leading-6 text-slate-400">
                                                Wir prüfen die Angaben. Sobald die Adresse bestätigt ist, kannst du Jobs veröffentlichen.
                                            </Dialog.Description>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleClose();
                                            }}
                                            className="mt-7 min-h-11 rounded-xl bg-[var(--brand)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)]"
                                        >
                                            Fertig
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="provider-verification-header relative border-b px-6 py-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 text-indigo-200">
                                                        <ShieldCheck size={20} />
                                                    </span>
                                                    <Dialog.Title as="h3" className="text-2xl font-semibold tracking-tight text-white">
                                                        Adresse zur Prüfung senden
                                                    </Dialog.Title>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleClose}
                                                    aria-label="Dialog schließen"
                                                    className="provider-verification-close flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative z-10 space-y-5 p-6">
                                            <div className="provider-verification-notice overflow-hidden rounded-2xl border">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNoticeOpen((open) => !open)}
                                                    aria-expanded={isNoticeOpen}
                                                    className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.025] focus:outline-none focus:ring-2 focus:ring-amber-200/20"
                                                >
                                                    <span className="flex min-w-0 items-center gap-3">
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200/15 bg-amber-200/[0.08] text-amber-200">
                                                            <AlertTriangle size={14} />
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-white">Echte Wohnadresse angeben</span>
                                                            <span className="block text-xs leading-5 text-slate-500">Falsche Angaben können zur Sperrung führen.</span>
                                                        </span>
                                                    </span>
                                                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-100/80">
                                                        Warum?
                                                        <ChevronDown
                                                            size={16}
                                                            className={cn("transition-transform duration-200", isNoticeOpen && "rotate-180")}
                                                        />
                                                    </span>
                                                </button>

                                                {isNoticeOpen && (
                                                    <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                                                        <p className="text-sm leading-6 text-slate-400">
                                                            Gib deine echte Wohnadresse an. Sie ist nicht öffentlich sichtbar; andere sehen nur die Entfernung.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="ml-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                                    Wohnadresse
                                                </label>
                                                {isAddressLocked ? (
                                                    <div className="provider-verification-address-card space-y-4 rounded-2xl border p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                                                                <CheckCircle2 size={18} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-base font-semibold text-white">
                                                                    {street} <span className="text-emerald-300">{houseNumber || "?"}</span>
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-500">{[zip, city].filter(Boolean).join(" ")}</p>
                                                            </div>
                                                        </div>

                                                        {!houseNumber && (
                                                            <div className="animate-in fade-in slide-in-from-top-1">
                                                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                                                    <AlertTriangle size={10} className="mr-1 inline" /> Hausnummer fehlt
                                                                </label>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        autoFocus
                                                                        placeholder="Nr."
                                                                        value={houseNumber}
                                                                        onChange={(e) => setHouseNumber(e.target.value)}
                                                                        className="h-10 w-24 rounded-xl border border-amber-500/30 bg-[#111217] text-center font-bold text-white focus:border-amber-500/60 focus:outline-none"
                                                                    />
                                                                    <div className="flex items-center text-xs leading-5 text-slate-500">
                                                                        Bitte ergänzen.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="border-t border-white/[0.06] pt-3">
                                                            <button
                                                                onClick={handleResetAddress}
                                                                className="text-xs font-bold text-slate-400 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-white"
                                                            >
                                                                Andere Adresse suchen
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-indigo-400">
                                                            <Search size={18} />
                                                        </div>
                                                        <LocationAutocomplete
                                                            onSelect={handleLocationSelect}
                                                            placeholder="Straße und Hausnummer"
                                                            className="w-full"
                                                            autoFocus
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {error && (
                                                <div role="alert" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-xs font-medium text-[var(--danger)] animate-in fade-in slide-in-from-top-1">
                                                    <AlertTriangle size={14} />
                                                    {error}
                                                </div>
                                            )}
                                        </div>

                                        <div className="provider-verification-footer flex flex-col-reverse gap-3 border-t px-6 py-5 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={handleClose}
                                                className="provider-verification-cancel h-11 rounded-xl px-5 text-sm font-bold transition-colors"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSubmit}
                                                disabled={isSubmitting || !street.trim() || !houseNumber.trim() || !city.trim() || !zip.trim() || latitude === null || longitude === null}
                                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                                <span>Prüfung anfragen</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
