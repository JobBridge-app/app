import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ShieldCheck, CheckCircle2, Search, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { LocationAutocomplete, LocationDetails } from "@/components/ui/LocationAutocomplete";

type ProviderVerificationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    profileId: string;
    onVerified: () => void;
};

export function ProviderVerificationModal({ isOpen, onClose, profileId, onVerified }: ProviderVerificationModalProps) {
    const [street, setStreet] = useState("");
    const [houseNumber, setHouseNumber] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);

    // New state for "Locked/Confirmed" address from API
    const [isAddressLocked, setIsAddressLocked] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setStreet("");
            setHouseNumber("");
            setCity("");
            setZip("");
            setIsAddressLocked(false);
            setError(null);
            setIsNoticeOpen(false);
        }
    }, [isOpen]);

    const handleLocationSelect = (loc: LocationDetails) => {
        // Updated Logic (v12): We ALWAYS lock the interface after selection.
        // If house number is extracted (either from API or smart query), it's set.
        // If not, we might prompt user or just let them save (if valid).

        const locAny = loc as any;
        const foundHouseNumber = locAny.house_number;

        setStreet(loc.address_line1);
        setHouseNumber(foundHouseNumber || "");
        setCity(loc.city || "");
        setZip(loc.postal_code || "");
        setIsAddressLocked(true); // Always lock to show the "Selected Address" view
        setError(null);
    };

    const handleResetAddress = () => {
        setStreet("");
        setHouseNumber("");
        setCity("");
        setZip("");
        setIsAddressLocked(false);
    };

    const handleSubmit = async () => {
        if (!street.trim() || !houseNumber.trim()) {
            setError("Bitte gib Straße und Hausnummer an.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: updateError } = await supabaseBrowser
                .from("profiles")
                .update({
                    street: street.trim(),
                    house_number: houseNumber.trim(),
                    city: city.trim() || null,
                    zip: zip.trim() || null,
                    provider_verification_status: "verified",
                    provider_verified_at: new Date().toISOString(),
                })
                .eq("id", profileId);

            if (updateError) throw updateError;

            // Trigger Success Animation
            setIsSuccess(true);

            // Wait for animation then close and notify
            setTimeout(() => {
                onVerified(); // This should trigger the banner removal in parent
                onClose();
            }, 2000);

        } catch (err) {
            console.error("Verification error:", err);
            setError("Fehler beim Speichern. Bitte versuche es erneut.");
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                                    <div className="provider-verification-success flex flex-col items-center justify-center py-16 px-6 space-y-8 relative z-10">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                                            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative z-10">
                                                <CheckCircle2 size={48} className="text-emerald-500 animate-[bounce_1s_infinite]" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-3">
                                            <h3 className="text-3xl font-black text-white tracking-tight">Verifiziert!</h3>
                                            <p className="text-slate-400 font-medium">Vielen Dank. Deine Adresse wurde bestätigt.</p>
                                        </div>
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
                                                        Adresse verifizieren
                                                    </Dialog.Title>
                                                </div>
                                                <button
                                                    onClick={onClose}
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
                                                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300 animate-in fade-in slide-in-from-top-1">
                                                    <AlertTriangle size={14} />
                                                    {error}
                                                </div>
                                            )}
                                        </div>

                                        <div className="provider-verification-footer flex flex-col-reverse gap-3 border-t px-6 py-5 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="provider-verification-cancel h-11 rounded-xl px-5 text-sm font-bold transition-colors"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSubmit}
                                                disabled={isSubmitting || !street.trim() || !houseNumber.trim()}
                                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-slate-950 shadow-lg shadow-white/10 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                                <span>Adresse bestätigen</span>
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
