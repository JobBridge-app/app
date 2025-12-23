"use client";

import { useSearchParams } from "next/navigation";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Suspense } from "react";

function GuardianAcceptContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 text-white">
                <h1 className="text-2xl font-bold text-red-400 mb-2">Ungültiger Link</h1>
                <p className="text-slate-400">Dieser Bestätigungslink ist unvollständig.</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 text-white">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Account bestätigen</h1>
                    <p className="text-slate-400">
                        Du bist dabei, den Account deines Kindes und die volle Verantwortung zu übernehmen.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <p className="text-sm text-slate-300 mb-6">
                        Durch die Bestätigung stimmst du zu, dass dein Kind über JobBridge Tätigkeiten annimmt und du als gesetzlicher Vertreter fungierst.
                    </p>
                    <ButtonPrimary
                        onClick={() => alert("Bestätigung wird verarbeitet... (Backend needed)")}
                        className="w-full"
                    >
                        Jetzt bestätigen
                    </ButtonPrimary>
                </div>
            </div>
        </div>
    );
}

export default function GuardianAcceptPage() {
    return (
        <Suspense fallback={<div className="text-white p-10 text-center">Laden...</div>}>
            <GuardianAcceptContent />
        </Suspense>
    );
}
