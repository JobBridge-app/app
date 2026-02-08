"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useMemo, useState } from "react";
import type { GuardianStatus } from "@/lib/types";

type GuardianBannerProps = {
    guardianStatus: GuardianStatus;
};

type InvitePayload = { token: string; expires_at: string };

export function GuardianBanner({ guardianStatus }: GuardianBannerProps) {
    const [status, setStatus] = useState<GuardianStatus>(guardianStatus);
    const [invite, setInvite] = useState<InvitePayload | null>(null);
    const [loading, setLoading] = useState(false);
    const inviteLink = useMemo(() => {
        if (!invite?.token) return null;
        if (typeof window === "undefined") return null;
        return `${window.location.origin}/guardian/accept?token=${encodeURIComponent(invite.token)}`;
    }, [invite?.token]);

    const createLink = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabaseBrowser.rpc("create_guardian_invitation", { p_invited_email: null });
            if (error) throw error;
            const payload = data as unknown as InvitePayload | null;
            if (!payload?.token) throw new Error("Invite konnte nicht erstellt werden.");
            setInvite(payload);
            setStatus("pending");
            if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.clipboard) {
                // Copy best-effort; user can still manually copy.
                const link = `${window.location.origin}/guardian/accept?token=${encodeURIComponent(payload.token)}`;
                await navigator.clipboard.writeText(link);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            alert(`Fehler: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    if (status === "linked") {
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
                        {status === "pending" ? "Elternbestätigung ausstehend" : "Elternbestätigung erforderlich"}
                    </h3>
                    <p className="text-amber-200/70 text-sm leading-relaxed max-w-xl">
                        {status === "pending"
                            ? "Der Bestätigungslink wurde erstellt. Bitte lasse einen Elternteil den Link öffnen und die Bestätigung abschließen."
                            : "Du kannst Jobs entdecken, aber um dich zu bewerben, muss ein Elternteil dein Konto bestätigen. So liegt die Verantwortung offiziell bei deinen Eltern."}
                    </p>
                    {inviteLink && (
                        <div className="mt-3 rounded-xl border border-amber-500/20 bg-black/20 p-3 text-xs text-amber-100/90 break-all">
                            {inviteLink}
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-10 md:ml-auto flex shrink-0">
                <ButtonPrimary
                    onClick={createLink}
                    disabled={loading}
                    className="bg-amber-500 hover:bg-amber-600 text-white border-none"
                >
                    {loading ? "Erstelle Link..." : (status === "pending" ? "Link erneut erstellen" : "Bestätigungslink erstellen")}
                </ButtonPrimary>
            </div>

            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
    );
}
