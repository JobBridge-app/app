"use client";

import { useState, useEffect } from "react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Modal } from "@/components/ui/Modal";
import { createGuardianInvitation, getActiveGuardianInvitation } from "@/app/actions/guardian";
import { Copy, X, CheckCircle, ShieldCheck } from "lucide-react";

interface GuardianConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    variant?: "initial" | "add"; // "initial" = mandatory first consent, "add" = adding additional guardian
}

export function GuardianConsentModal({ isOpen, onClose, variant = "initial" }: GuardianConsentModalProps) {
    const [step, setStep] = useState<"initial" | "generated">("initial");
    const [isLoading, setIsLoading] = useState(false);
    const [link, setLink] = useState("");
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Countdown logic
    useEffect(() => {
        if (!expiresAt) return;

        const updateTimeLeft = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft("Abgelaufen");
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`noch ${hours} Std. ${minutes} Min.`);
            }
        };

        updateTimeLeft(); // Initial call
        const interval = setInterval(updateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [expiresAt]); // Run when expiresAt changes

    // Check for existing invitation on mount
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getActiveGuardianInvitation().then(res => {
                setIsLoading(false);
                if (res.token) {
                    const url = `${window.location.origin}/guardian/access?token=${res.token}`;
                    setLink(url);
                    setExpiresAt(res.expires_at || null);
                    setStep("generated");
                }
                // If no active token, we stay in "initial" step, allowing user to read info/create later.
            });
        }
    }, [isOpen]);

    const fetchOrGenerateLink = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await createGuardianInvitation();
            if (res.error) {
                setError(res.error);
            } else if (res.token) {
                const url = `${window.location.origin}/guardian/access?token=${res.token}`;
                setLink(url);
                setExpiresAt(res.expires_at || null);
                setStep("generated");
            }
        } catch (e) {
            setError("Ein unerwarteter Fehler ist aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-white">
                        {variant === "initial" ? "Jugendschutz & Datenschutz" : "Elternteil hinzufügen"}
                    </span>
                </div>
            }
        >
            <div className="space-y-6">
                {step === "initial" ? (
                    <>
                        <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-800">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-white font-medium">
                                        {variant === "initial" ? "Einverständnis erforderlich" : "Weiteren Erziehungsberechtigten einladen"}
                                    </h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {variant === "initial"
                                            ? "Um deine Sicherheit zu gewährleisten und den gesetzlichen Anforderungen (DSGVO & Jugendschutz) zu entsprechen, benötigen wir vor deiner ersten Bewerbung eine einmalige Bestätigung durch deine Eltern."
                                            : "Möchtest du einen weiteren Elternteil oder Erziehungsberechtigten hinzufügen? Erstelle hier einen Link und sende ihn an die entsprechende Person."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                {error}
                            </div>
                        )}

                        <div>
                            <ButtonPrimary
                                onClick={fetchOrGenerateLink}
                                disabled={isLoading}
                                className="w-full justify-center py-6 text-base"
                            >
                                {isLoading ? "Wird geladen..." : "Link erstellen / anzeigen"}
                            </ButtonPrimary>
                            <p className="text-center text-xs text-slate-500 mt-3">
                                Erstellt einen neuen Link oder zeigt den aktiven an.
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">
                                {variant === "initial"
                                    ? "Bitte sende den folgenden Link an deine Eltern. Sobald sie bestätigt haben, kannst du dich bewerben."
                                    : "Bitte sende diesen Link an deinen Elternteil. Nach der Bestätigung wird die Person deinem Profil hinzugefügt."}
                            </p>

                            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dein Bestätigungslink</span>
                                    <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded font-bold tracking-wide">
                                        {timeLeft || "GÜLTIG"}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1 bg-black/40 rounded-lg px-3 py-3 text-sm text-slate-300 font-mono truncate border border-slate-800/50 flex items-center">
                                        {link}
                                    </div>
                                    <button
                                        onClick={copyToClipboard}
                                        className={`flex items-center justify-center px-4 rounded-lg transition-all duration-200 font-medium border ${copied
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "bg-indigo-600 border-indigo-600 hover:bg-indigo-500 text-white"
                                            }`}
                                    >
                                        {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors font-medium border border-slate-700"
                        >
                            Schließen
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
}
