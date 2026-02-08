"use client";

import { useState } from "react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { createGuardianInvitation } from "@/app/actions/guardian";
import { Copy, X, CheckCircle, ShieldCheck } from "lucide-react";

interface GuardianConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GuardianConsentModal({ isOpen, onClose }: GuardianConsentModalProps) {
    const [step, setStep] = useState<"initial" | "generated">("initial");
    const [isLoading, setIsLoading] = useState(false);
    const [link, setLink] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const generateLink = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await createGuardianInvitation();
            if (res.error) {
                setError(res.error);
            } else if (res.token) {
                const url = `${window.location.origin}/guardian/access?token=${res.token}`;
                setLink(url);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Jugendschutz & Datenschutz</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === "initial" ? (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-indigo-400 mt-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                    </span>
                                    <div>
                                        <h3 className="text-white font-medium">Einverständnis erforderlich</h3>
                                        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                            Um deine Sicherheit zu gewährleisten und den gesetzlichen Anforderungen (DSGVO & Jugendschutz) zu entsprechen, benötigen wir vor deiner ersten Bewerbung eine einmalige Bestätigung durch deine Eltern.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <ButtonPrimary
                                    onClick={generateLink}
                                    disabled={isLoading}
                                    className="w-full justify-center"
                                >
                                    {isLoading ? "Link wird erstellt..." : "Link für Eltern erstellen"}
                                </ButtonPrimary>
                                <p className="text-center text-xs text-slate-500 mt-3">
                                    Diesen Link kannst du an deine Eltern weiterleiten.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Dein Bestätigungslink</span>
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">48H GÜLTIG</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">
                                    Sende diesen Link an deine Eltern.
                                </p>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/50 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono truncate border border-slate-800">
                                        {link}
                                    </code>
                                    <button
                                        onClick={copyToClipboard}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-all duration-200 border ${copied
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : "bg-indigo-600 border-indigo-600 hover:bg-indigo-500 text-white"
                                            }`}
                                    >
                                        {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="text-center">
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-white text-sm transition-colors py-2"
                                >
                                    Schließen
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
