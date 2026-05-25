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
            <div data-status="linked" className="guardian-banner guardian-banner-compact relative group overflow-hidden rounded-[1.5rem] border p-6 flex items-start gap-5 mb-10">
                <div className="guardian-banner-tint absolute inset-0 transition-colors duration-500" />
                <div className="guardian-banner-glow absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px]" />

                <div className="guardian-banner-icon relative z-10 p-3 border rounded-2xl shrink-0 shadow-lg">
                    <CheckCircle2 size={24} />
                </div>

                <div className="relative z-10 flex-1">
                    <h3 className="guardian-banner-title text-lg font-bold mb-1 tracking-tight">
                        Elternbestätigung aktiv
                    </h3>
                    <p className="guardian-banner-copy text-sm font-medium leading-relaxed">
                        Dein Konto wurde von einem Elternteil bestätigt. Du kannst Jobs annehmen.
                    </p>
                </div>

                <button
                    onClick={handleDismiss}
                    className="guardian-banner-dismiss relative z-10 p-2 rounded-full transition-colors"
                    title="Hinweis ausblenden"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
            </div>
        );
    }

    const isPending = guardianStatus === "pending";
    const status = isPending ? "pending" : "required";

    return (
        <>
            <div data-status={status} className="guardian-banner guardian-banner-actionable relative overflow-hidden rounded-[2rem] border p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="guardian-banner-noise absolute inset-0" />
                <div className="guardian-banner-glow absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex items-start gap-6 flex-1">
                    <div className="guardian-banner-icon p-4 border rounded-2xl shrink-0 shadow-[0_0_30px_-5px_rgba(0,0,0,0.3)]">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="guardian-banner-title text-xl md:text-2xl font-bold tracking-tight">
                            {isPending ? "Bestätigung ausstehend" : "Elternbestätigung erforderlich"}
                        </h3>
                        <p className="guardian-banner-copy text-base font-medium leading-relaxed max-w-2xl">
                            {isPending
                                ? "Du hast bereits einen Link erstellt. Bitte lasse ihn bestätigen."
                                : "Um dich bewerben zu können, benötigen wir die Bestätigung eines Elternteils."}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 md:ml-auto flex shrink-0">
                    <ButtonPrimary
                        onClick={() => setIsModalOpen(true)}
                        className="guardian-banner-action border-none px-8 py-4 text-sm font-extrabold uppercase tracking-widest"
                    >
                        {isPending ? "Link anzeigen" : "Bestätigung starten"}
                    </ButtonPrimary>
                </div>
            </div>

            <GuardianConsentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                variant="initial"
            />
        </>
    );
}
