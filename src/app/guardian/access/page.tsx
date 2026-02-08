"use client";

import { useSearchParams } from "next/navigation";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useState } from "react";
import { ShieldCheck, CheckCircle, AlertCircle } from "lucide-react";

function GuardianAccessContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    // Initial check handled by UI state

    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 text-white">
                <div className="w-full max-w-md text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold">Ungültiger Link</h1>
                    <p className="text-slate-400">Dieser Bestätigungslink ist unvollständig oder fehlerhaft.</p>
                </div>
            </div>
        );
    }

    const confirm = async () => {
        setState("loading");
        setError(null);
        try {
            const { data, error } = await supabaseBrowser.rpc("redeem_guardian_invitation", { token_input: token });
            if (error) throw error;
            const res = data as unknown as { success?: boolean; error?: string } | null;
            if (!res?.success) {
                throw new Error(res?.error || "Bestätigung fehlgeschlagen.");
            }
            setState("success");
        } catch (e) {
            setState("error");
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            setError(msg);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full" />
            </div>

            <div className="relative max-w-md w-full space-y-8 text-center z-10">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Account bestätigen</h1>
                        <p className="text-slate-400">
                            Übernehme Verantwortung für das JobBridge-Konto deines Kindes.
                        </p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                    <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                        Durch die Bestätigung stimmst du zu, dass dein Kind über JobBridge Tätigkeiten annimmt und du als gesetzlicher Vertreter fungierst.
                    </p>

                    {state === "success" ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mx-auto w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-emerald-200 mb-2">Erfolgreich bestätigt</h3>
                            <p className="text-sm text-emerald-200/80">
                                Das Konto ist nun freigeschaltet. Du kannst dieses Fenster schließen.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <ButtonPrimary
                                onClick={confirm}
                                disabled={state === "loading"}
                                className="w-full justify-center h-12 text-base font-medium"
                            >
                                {state === "loading" ? "Wird bestätigt..." : "Jetzt bestätigen"}
                            </ButtonPrimary>

                            {state === "error" && (
                                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center gap-3 text-left">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">Fehler</p>
                                        <p className="opacity-80">{error || "Bestätigung fehlgeschlagen."}</p>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 mt-4">
                                Hinweis: Du musst als Elternteil eingeloggt sein oder einen Account erstellen.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function GuardianAccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="animate-pulse">Laden...</div></div>}>
            <GuardianAccessContent />
        </Suspense>
    );
}
