"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { cn } from "@/lib/utils";

type GuardianBannerProps = {
    isVerified: boolean;
};

export function GuardianBanner({ isVerified }: GuardianBannerProps) {
    if (isVerified) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-start gap-4 mb-8">
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
            </div>
        );
    }

    return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start gap-6 mb-8 relative overflow-hidden">
            <div className="relative z-10 flex items-start gap-4">
                <div className="p-2 bg-amber-500/20 rounded-full text-amber-400 shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-amber-100">
                        Elternbestätigung erforderlich
                    </h3>
                    <p className="text-amber-200/70 text-sm leading-relaxed max-w-xl">
                        Du kannst Jobs entdecken, aber um dich zu bewerben, muss ein Elternteil dein Konto bestätigen.
                        So liegt die Verantwortung offiziell bei deinen Eltern.
                    </p>
                </div>
            </div>

            <div className="relative z-10 md:ml-auto flex shrink-0">
                <ButtonPrimary
                    onClick={() => alert("Link-Generierung noch nicht implementiert (Backend)")}
                    className="bg-amber-500 hover:bg-amber-600 text-white border-none"
                >
                    Bestätigungslink erstellen
                </ButtonPrimary>
            </div>

            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
    );
}
