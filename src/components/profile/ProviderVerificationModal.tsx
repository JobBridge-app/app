import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, MapPin, Building2, ShieldCheck, Info, CheckCircle2, Search, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // New state for "Locked/Confirmed" address from API
    const [isAddressLocked, setIsAddressLocked] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setStreet("");
            setHouseNumber("");
            setIsAddressLocked(false);
            setError(null);
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
        setIsAddressLocked(true); // Always lock to show the "Selected Address" view
        setError(null);
    };

    const handleResetAddress = () => {
        setStreet("");
        setHouseNumber("");
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

    const supportMailto = `mailto:support@jobbridge.de?subject=${encodeURIComponent("Problem bei der Adress-Verifizierung")}&body=${encodeURIComponent("Hallo Support,\n\nich habe ein Problem mit meiner Adresse...")}`;

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
                    <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md" />
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
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-[#0A0A0C] border border-white/10 p-0 text-left align-middle shadow-2xl transition-all relative">
                                {/* Ambient Background Glow */}
                                <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                                <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

                                {isSuccess ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-6 space-y-8 relative z-10">
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
                                        {/* Header */}
                                        <div className="relative p-6 px-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                            <Dialog.Title as="h3" className="text-xl font-bold text-white flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                    <ShieldCheck className="text-indigo-400" size={20} />
                                                </div>
                                                <span>Adresse verifizieren</span>
                                            </Dialog.Title>
                                            <button
                                                onClick={onClose}
                                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="p-8 space-y-8 relative z-10">
                                            {/* Info Box */}
                                            <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-5 flex gap-4">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <Info className="text-indigo-400" size={20} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-indigo-200">
                                                        Wahre Identität
                                                    </p>
                                                    <p className="text-xs text-indigo-300/70 leading-relaxed">
                                                        Bitte gib deine <span className="font-bold text-indigo-200">richtige Wohnadresse</span> an. Diese Angabe ist verbindlich und erhöht deinen <span className="font-bold text-indigo-200">Trust Score</span>. Falschangaben führen zur Sperrung.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {isAddressLocked ? (
                                                    // LOCKED STATE (Address Found)
                                                    <div className="p-1 rounded-2xl bg-[#0F0F12] border border-emerald-500/20 p-5 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                                                <CheckCircle2 size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ausgewählte Adresse</p>
                                                                <p className="text-base font-bold text-white">
                                                                    {street} <span className="text-emerald-400">{houseNumber || "?"}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Fallback for missing House Number (v12) */}
                                                        {!houseNumber && (
                                                            <div className="animate-in fade-in slide-in-from-top-1">
                                                                <label className="text-[10px] uppercase font-bold text-amber-500 tracking-wider mb-1 block">
                                                                    <AlertTriangle size={10} className="inline mr-1" /> Hausnummer fehlt
                                                                </label>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        autoFocus
                                                                        placeholder="Nr."
                                                                        value={houseNumber}
                                                                        onChange={(e) => setHouseNumber(e.target.value)}
                                                                        className="w-20 h-10 rounded-lg bg-[#15151A] border border-amber-500/30 text-white text-center font-bold focus:outline-none focus:border-amber-500/60"
                                                                    />
                                                                    <div className="flex items-center text-xs text-slate-500">
                                                                        Bitte ergänzen.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3 pt-2">
                                                            <button
                                                                onClick={handleResetAddress}
                                                                className="text-xs font-bold text-slate-500 hover:text-white transition-colors underline decoration-slate-700 underline-offset-4"
                                                            >
                                                                Andere Adresse suchen
                                                            </button>
                                                            <div className="h-3 w-px bg-white/10" />
                                                            <a href={supportMailto} className="text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors">
                                                                Daten falsch? Melden
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // SEARCH & MANUAL ENTRY
                                                    <>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                                                Adresse suchen
                                                            </label>
                                                            <div className="relative group">
                                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none z-10">
                                                                    <Search size={18} />
                                                                </div>
                                                                <LocationAutocomplete
                                                                    onSelect={handleLocationSelect}
                                                                    placeholder="Straße suchen (z.B. Hauptstraße)..."
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Legacy Manual Inputs REMOVED (v12) */}
                                                        {/* User requested removal of manual fields below search. */}

                                                        <div className="flex justify-end pt-2">
                                                            <a href={supportMailto} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors">
                                                                Daten falsch? Fehler melden
                                                            </a>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {error && (
                                                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                                                    <AlertTriangle size={14} />
                                                    {error}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 px-8 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSubmit}
                                                disabled={isSubmitting}
                                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                            >
                                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                                <span>Jetzt bestätigen</span>
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
