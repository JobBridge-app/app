"use server";

import { supabaseServer } from "@/lib/supabaseServer";

type GuardianRedemptionResult =
    | { success: true }
    | { success: false; message: string };

const INVALID_LINK_MESSAGE =
    "Dieser Bestätigungslink ist unvollständig oder ungültig. Bitte fordere einen neuen Link an.";
const SESSION_ERROR_MESSAGE =
    "Deine Sitzung konnte nicht bestätigt werden. Bitte melde dich erneut an und versuche es noch einmal.";
const CONFIRMATION_ERROR_MESSAGE =
    "Die Bestätigung konnte nicht abgeschlossen werden. Der Link ist möglicherweise abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen Link an.";

const REDEMPTION_ERROR_MESSAGES: Record<string, string> = {
    guardian_profile_required: "Bitte richte zuerst dein eigenes Anbieterprofil vollständig ein.",
    guardian_must_be_adult: "Die Freigabe kann nur von einer volljährigen Person bestätigt werden.",
    guardian_account_ineligible: "Für die Freigabe wird ein privates, volljähriges Anbieterprofil benötigt.",
    guardian_profile_ineligible: "Für die Freigabe wird ein vollständiges privates Erwachsenenkonto benötigt.",
    self_guardian_not_allowed: "Du kannst die Freigabe für dein eigenes Konto nicht selbst erteilen.",
    self_link_not_allowed: "Du kannst die Freigabe für dein eigenes Konto nicht selbst erteilen.",
    child_profile_unavailable: "Das verknüpfte Jugendkonto ist nicht mehr verfügbar.",
    invalid_or_expired_invitation: CONFIRMATION_ERROR_MESSAGE,
};

export async function redeemGuardianInvitation(token: string): Promise<GuardianRedemptionResult> {
    const normalizedToken = typeof token === "string" ? token.trim() : "";
    if (!normalizedToken || normalizedToken.length > 512) {
        return { success: false, message: INVALID_LINK_MESSAGE };
    }

    try {
        const supabase = await supabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("[guardian-access] Authentication failed during invitation redemption", {
                userId: user?.id ?? null,
                error: authError,
            });
            return { success: false, message: SESSION_ERROR_MESSAGE };
        }

        const { data, error } = await supabase.rpc("redeem_guardian_invitation", {
            token_input: normalizedToken,
        });

        if (error) {
            console.error("[guardian-access] Invitation redemption RPC failed", {
                userId: user.id,
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            });
            return { success: false, message: CONFIRMATION_ERROR_MESSAGE };
        }

        const result = data as unknown as { success?: boolean; error?: string } | null;
        if (!result?.success) {
            console.error("[guardian-access] Invitation redemption was rejected", {
                userId: user.id,
                reason: result?.error ?? "RPC response did not include success",
            });
            return {
                success: false,
                message: REDEMPTION_ERROR_MESSAGES[result?.error ?? ""] ?? CONFIRMATION_ERROR_MESSAGE,
            };
        }

        return { success: true };
    } catch (error) {
        console.error("[guardian-access] Unexpected invitation redemption failure", error);
        return { success: false, message: CONFIRMATION_ERROR_MESSAGE };
    }
}
