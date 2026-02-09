"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { useState, useEffect } from "react";
import type { GuardianStatus } from "@/lib/types";
import { GuardianConsentModal } from "@/components/GuardianConsentModal";

type GuardianBannerProps = {
    guardianStatus: GuardianStatus;
};



export function GuardianBanner({ guardianStatus }: GuardianBannerProps) {
    const [isDismissed, setIsDismissed] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem("guardian_banner_dismissed");
        if (dismissed === "true") {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("guardian_banner_dismissed", "true");
        setIsDismissed(true);
    };

    if (guardianStatus === "linked") {
        if (isDismissed) return null;

        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-start gap-4 mb-8 relative group">
                <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-400">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-emerald-100 mb-1">
                        Elternbestätigung aktiv
                    </h3>
                    <p className="text-emerald-200/70 text-sm">
                        Dein Konto wurde von einem Elternteil bestätigt. Du kannst Jobs annehmen.
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 text-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-full transition-colors"
                    title="Hinweis ausblenden"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 mb-8 relative overflow-hidden">
                <div className="relative z-10 flex items-start gap-4 flex-1">
                    <div className="p-2 bg-amber-500/20 rounded-full text-amber-400 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-amber-100">
                            {guardianStatus === "pending" ? "Bestätigung ausstehend" : "Elternbestätigung erforderlich"}
                        </h3>
                        <p className="text-amber-200/70 text-sm leading-relaxed max-w-xl">
                            {guardianStatus === "pending"
                                ? "Du hast bereits einen Link erstellt. Bitte lasse ihn bestätigen."
                                : "Um dich bewerben zu können, benötigen wir die Bestätigung eines Elternteils."}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 md:ml-auto flex shrink-0">
                    <ButtonPrimary
                        onClick={() => setIsModalOpen(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white border-none px-6"
                    >
                        {guardianStatus === "pending" ? "Link anzeigen" : "Bestätigung starten"}
                    </ButtonPrimary>
                </div>

                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            <GuardianConsentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
